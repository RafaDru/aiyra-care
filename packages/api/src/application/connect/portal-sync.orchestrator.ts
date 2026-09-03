import type { Pool } from 'pg'
import type { FastifyBaseLogger } from 'fastify'
import type { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'
import type { IntegrationLinkRepository } from '../../domain/integration-link/integration-link.repository.js'
import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import { UnimedBhSyncScraper } from '../../infrastructure/scraper/unimedbh-sync.scraper.js'
import { AmilSyncScraper } from '../../infrastructure/scraper/amil-sync.scraper.js'
import { isUnimedSessionUsable } from '../../infrastructure/scraper/unimedbh-login.helper.js'
import {
  type SyncAuthorizationDetail,
} from '../../infrastructure/scraper/sync-progress-store.js'
import { encrypt, decrypt } from '../../infrastructure/crypto-helper.js'
import { PatientPgRepository } from '../../infrastructure/persistence/patient.pg.repository.js'
import { unimedResultToCanonicalBatch } from './mappers/unimed-canonical.mapper.js'
import { amilResultToCanonicalBatchAsync } from './mappers/amil-canonical.mapper.js'
import { buildClassificationClassifier, type BuildClassificationClassifierOpts } from '../llm/llm-internal-cost.factory.js'
import { CanonicalBatchImporterService, type CanonicalImportOutcome } from './canonical-batch-importer.service.js'
import {
  computeUnimedAuthorizationSince,
  computeUnimedExtratoMonths,
  computeAmilGuidesPeriodStart,
} from './sync-delta.helper.js'
import { normalizeName } from './connect-sync.helpers.js'
import {
  applyPortalSyncAuthFailure,
} from '../integration-link/portal-sync-auth.helper.js'
import type { UnimedBhUsageItem } from '../../infrastructure/scraper/unimedbh-extrato.scraper.js'
import type {
  SyncBeneficiaryDetail,
  SyncUnmatchedBeneficiary,
} from '../../infrastructure/scraper/sync-progress-store.js'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'

function emitScraperProgress(
  onProgress: (step: string, message: string, status: 'running' | 'success' | 'failed') => void,
): (p: ScraperProgress) => void {
  return (p) => onProgress(
    p.step,
    p.message,
    p.status === 'failed' ? 'failed' : p.status === 'success' ? 'success' : 'running',
  )
}

export interface UnimedSyncParams {
  link: IntegrationLink
  decryptedPassword: string
  jobId: string
  onProgress: (step: string, message: string, status: 'running' | 'success' | 'failed') => void
  log?: FastifyBaseLogger
  /** Sync silencioso — janela menor no extrato e menos detalhes de autorização. */
  incremental?: boolean
}

export interface UnimedSyncResult {
  importOutcome: CanonicalImportOutcome
  authorizationDetails: SyncAuthorizationDetail[]
}

export interface AmilSyncParams {
  link: IntegrationLink
  decryptedPassword: string
  jobId: string
  onProgress: (step: string, message: string, status: 'running' | 'success' | 'failed') => void
  patientName?: string
  log?: FastifyBaseLogger
  interactiveLogin?: boolean
  /** Sync silencioso — janela menor em guias/tokens. */
  incremental?: boolean
}

export interface AmilSyncResult {
  importOutcome: CanonicalImportOutcome
  beneficiaryDetails: SyncBeneficiaryDetail[]
  unmatchedBeneficiaries: SyncUnmatchedBeneficiary[]
}

export class PortalSyncOrchestrator {
  private readonly importer: CanonicalBatchImporterService
  private readonly patientRepo: PatientRepository

  constructor(
    private readonly pool: Pool,
    private readonly linkRepo: IntegrationLinkRepository,
  ) {
    this.importer = new CanonicalBatchImporterService(pool)
    this.patientRepo = new PatientPgRepository(pool)
  }

  async runUnimedSync(params: UnimedSyncParams): Promise<UnimedSyncResult> {
    const { link, decryptedPassword, jobId, onProgress, log, incremental = false } = params

    const extratoMonths = computeUnimedExtratoMonths(incremental)
    const authorizationSince = computeUnimedAuthorizationSince(link, incremental)
    if (incremental) {
      log?.info(
        { linkId: link.id, extratoMonths, authorizationSince: authorizationSince?.toISOString() },
        'Unimed incremental sync window',
      )
    }

    const storedUnimedState =
      link.encryptedSessionToken && isUnimedSessionUsable(link.sessionExpiresAt)
        ? decrypt(link.encryptedSessionToken)
        : undefined

    const patient = await this.patientRepo.findById(link.patientId)
    const scraper = new UnimedBhSyncScraper()
    const result = await scraper.scrape(
      link.email!,
      decryptedPassword,
      emitScraperProgress(onProgress),
      {
        patientName: patient?.name,
        cardNumber: link.cardNumber || undefined,
        storageStateJson: storedUnimedState,
        jobId,
        extratoMonths,
        authorizationSince,
        patientId: link.patientId,
        fetchCarenciaPdf: !incremental,
      },
    )

    if (result.sessionStorageState) {
      link.setSessionToken(
        encrypt(result.sessionStorageState),
        result.sessionExpiresAt ?? new Date(Date.now() + 48 * 60 * 60 * 1000),
      )
    }

    onProgress('importing', 'Salvando dados...', 'running')

    const householdPatients = await this.patientRepo.findAllByHousehold(link.patientId)
    const possiblePatientIds = householdPatients.map((p) => p.id)

    const batch = await unimedResultToCanonicalBatch(result, {
      connectionId: link.id,
      jobId,
      possiblePatientIds,
    })

    const importOutcome = await this.importer.ingestBatch(batch, link.patientId, link.id)

    if (!link.cardNumber) {
      const allItems: UnimedBhUsageItem[] = [...result.extrato.paciente]
      for (const depItems of Object.values(result.extrato.dependentes)) {
        allItems.push(...depItems)
      }
      const patientNorm = normalizeName(patient?.name)
      const matched =
        allItems.find((item) => item.cardNumber && normalizeName(item.patientName) === patientNorm)
        || allItems.find((item) => !!item.cardNumber && item.cardNumber.replace(/\s/g, '').length >= 6)
      if (matched?.cardNumber) link.setCardNumber(matched.cardNumber)
    } else if (importOutcome.cardNumberHint) {
      link.setCardNumber(importOutcome.cardNumberHint)
    }

    link.clearAuthAttention()
    link.markSynced()
    await this.linkRepo.update(link)

    return {
      importOutcome,
      authorizationDetails: importOutcome.authorizationDetails,
    }
  }

  async handleUnimedSyncFailure(link: IntegrationLink, err: unknown, log?: FastifyBaseLogger): Promise<string> {
    const message = err instanceof Error ? err.message : 'Erro na sincronização'
    log?.error(err, 'Unimed sync failed')
    return applyPortalSyncAuthFailure(link, this.linkRepo, 'unimed', message)
  }

  async runAmilSync(params: AmilSyncParams): Promise<AmilSyncResult> {
    const { link, decryptedPassword, jobId, onProgress, patientName, log, interactiveLogin, incremental = false } = params

    const guidesPeriodStart = computeAmilGuidesPeriodStart(link, incremental)
    if (incremental) {
      log?.info(
        { linkId: link.id, guidesPeriodStart: guidesPeriodStart.toISOString() },
        'Amil incremental sync window',
      )
    }

    const renewWindowMs = Number(process.env.AMIL_SESSION_RENEW_MS ?? String(24 * 60 * 60 * 1000))
    if (link.encryptedSessionToken && link.sessionExpiresAt) {
      const msUntilExpiry = link.sessionExpiresAt.getTime() - Date.now()
      if (msUntilExpiry > 0 && msUntilExpiry < renewWindowMs) {
        const scraper = new AmilSyncScraper()
        const refreshed = await scraper.tryRefreshTokenFromCdp()
        if (refreshed) {
          link.setSessionToken(encrypt(refreshed.token), refreshed.expiresAt)
          await this.linkRepo.update(link)
          log?.info({ linkId: link.id }, 'Amil session refreshed via CDP')
        }
      }
    }

    const storedToken = link.encryptedSessionToken ? decrypt(link.encryptedSessionToken) : undefined
    const amilScraper = new AmilSyncScraper()
    const result = await amilScraper.scrape(
      link.email!,
      decryptedPassword,
      emitScraperProgress(onProgress),
      {
        patientName,
        cardNumber: link.cardNumber || undefined,
        sessionToken: storedToken,
        interactiveLogin,
        guidesPeriodStart,
        incremental,
      },
    )

    link.setSessionToken(encrypt(result.sessionToken), result.sessionExpiresAt)

    onProgress('importing', 'Salvando dados Amil...', 'running')

    const batch = await amilResultToCanonicalBatchAsync(result, {
      connectionId: link.id,
      jobId,
      skipCoverage: incremental,
      classifier: this.buildAmilClassifier(link.patientId),
    })

    const importOutcome = await this.importer.ingestBatch(batch, link.patientId, link.id)

    const holderEntry = result.beneficiaryData.find((d) => d.beneficiary.role === 'holder')
      ?? result.beneficiaryData[0]
    const cardHint = importOutcome.cardNumberHint ?? holderEntry?.cardNumber
    if (cardHint && cardHint !== link.cardNumber) {
      link.setCardNumber(cardHint)
    }

    link.clearAuthAttention()
    link.markSynced()
    await this.linkRepo.update(link)

    return {
      importOutcome,
      beneficiaryDetails: importOutcome.beneficiaryDetails ?? [],
      unmatchedBeneficiaries: importOutcome.unmatchedBeneficiaries ?? [],
    }
  }

  async handleAmilSyncFailure(link: IntegrationLink, err: unknown, log?: FastifyBaseLogger): Promise<string> {
    const message = err instanceof Error ? err.message : 'Erro na sincronização Amil'
    log?.error(err, 'Amil sync failed')
    return applyPortalSyncAuthFailure(link, this.linkRepo, 'amil', message)
  }

  /** Classificador Amil com fallback LLM (custo interno) — degrada p/ regras se desligado/teto esgotado. */
  private buildAmilClassifier(patientId: string): ReturnType<typeof buildClassificationClassifier> {
    const opts: BuildClassificationClassifierOpts = { patientId, trigger: 'sync' }
    return buildClassificationClassifier(this.pool, opts)
  }
}
