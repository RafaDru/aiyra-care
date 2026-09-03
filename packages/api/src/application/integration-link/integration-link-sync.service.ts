import type { FastifyBaseLogger } from 'fastify'
import type { Pool } from 'pg'
import type { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'
import type { IntegrationLinkRepository } from '../../domain/integration-link/integration-link.repository.js'
import type { SyncJobTrigger, SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'
import type { SyncablePortalType } from '../../domain/scraper/sync-portal-profile.js'
import { PortalSyncOrchestrator } from '../connect/portal-sync.orchestrator.js'
import { attachNoveltyToSyncResult, noveltyFromImportOutcome } from '../connect/sync-novelty.helper.js'
import {
  computeHermesPardiniExamStartDate,
  computeMaterDeiExamStartDate,
  collectHouseholdPatientIds,
} from '../connect/sync-delta.helper.js'
import { normalizeName } from '../connect/connect-sync.helpers.js'
import { isIntegrationLinkSessionReady } from './integration-link-session.js'
import { parseFlexiblePortalDate, parsePortalDate } from './integration-link-sync-date.helper.js'
import { Exam } from '../../domain/exam/exam.entity.js'
import { Vaccine } from '../../domain/vaccine/vaccine.entity.js'
import { MedicalRecord } from '../../domain/medical-record/medical-record.entity.js'
import { encrypt, decrypt } from '../../infrastructure/crypto-helper.js'
import { ExamPgRepository } from '../../infrastructure/persistence/exam.pg.repository.js'
import { ExamOrderPgRepository } from '../../infrastructure/persistence/exam-order.pg.repository.js'
import { ExamOrderService } from '../exam-order/exam-order.service.js'
import { VaccinePgRepository } from '../../infrastructure/persistence/vaccine.pg.repository.js'
import { MedicalRecordPgRepository } from '../../infrastructure/persistence/medical-record.pg.repository.js'
import { PatientPgRepository } from '../../infrastructure/persistence/patient.pg.repository.js'
import { SyncJobPgRepository } from '../../infrastructure/persistence/sync-job.pg.repository.js'
import { HermesPardiniSyncScraper } from '../../infrastructure/scraper/hermes-pardini-sync.scraper.js'
import {
  buildMaterDeiExamMeta,
  materDeiExamNotes,
  persistMaterDeiExamFiles,
} from '../../infrastructure/scraper/materdei-exam-persist.js'
import {
  hermesPardiniExamNotes,
  persistHermesPardiniLaudos,
} from '../../infrastructure/scraper/hermes-pardini-exam-persist.js'
import { materDeiExamDedupKey, type MaterDeiExamItem } from '../../infrastructure/scraper/materdei-exam.mapper.js'
import { resolveMaterDeiPatientId } from '../../infrastructure/scraper/materdei-patient-resolver.js'
import {
  MaterDeiSyncScraper,
  MATER_DEI_ORIGIN,
  resolveMaterDeiGatewayPatientId,
} from '../../infrastructure/scraper/materdei-sync.scraper.js'
import { scheduleImportLineageProjection } from '../../infrastructure/graph/import-lineage-graph.js'
import { createJob, updateJob, bindSyncJobPersistence } from '../../infrastructure/scraper/sync-progress-store.js'
import { dispatchBackgroundTask } from '../../infrastructure/sync/background-dispatch.js'
import { withBrowserSyncMutex } from '../../infrastructure/sync/browser-sync-mutex.js'
import type { MatchablePatient } from '../insurance-plan/amil-beneficiary-matcher.js'
import { request as playwrightRequest } from 'playwright'
import { AgenticScraperService } from '../scraper/agentic-scraper.service.js'
import type { Patient } from '../../domain/patient/patient.entity.js'
import { runExamMeasurementImport } from '../measurement/exam-measurement-import.helper.js'
import { runHygieneScanForPatient } from '../hygiene/hygiene-scan.helper.js'
import {
  applyPortalSyncAuthFailure,
  classifyPortalSyncFailure,
} from './portal-sync-auth.helper.js'
import { getRuntimeDegradedService } from '../ops/runtime-degraded.factory.js'

const SYNCABLE_PORTALS = new Set<string>(['unimed', 'amil', 'mater_dei', 'hermes_pardini', 'bradesco_saude'])
const RECENT_SYNC_MS = Number(process.env.SYNC_MIN_INTERVAL_MS ?? String(30 * 60 * 1000))

export type IntegrationLinkSyncSkipReason =
  | 'unsupported_portal'
  | 'missing_credentials'
  | 'active_job'
  | 'lock'
  | 'recent_sync'
  | 'session_required'
  | 'portal_degraded'

export interface IntegrationLinkSyncRequest {
  silent?: boolean
  force?: boolean
  trigger?: SyncJobTrigger
  /** Fire-and-forget no processo da API (default true). */
  background?: boolean
  log?: FastifyBaseLogger
}

export interface IntegrationLinkSyncResult {
  jobId: string | null
  skipped?: boolean
  reason?: IntegrationLinkSyncSkipReason
}

export interface ScheduledSyncItemResult {
  linkId: string
  portalType: string
  patientId: string
  jobId?: string
  skipped?: boolean
  reason?: IntegrationLinkSyncSkipReason
  error?: string
}

export interface ScheduledSyncReport {
  candidates: number
  started: number
  skipped: number
  failed: number
  items: ScheduledSyncItemResult[]
}

export class IntegrationLinkSyncService {
  private readonly syncLocks = new Set<string>()
  private readonly portalSync: PortalSyncOrchestrator
  private readonly syncJobRepo: SyncJobPgRepository

  constructor(
    private readonly pool: Pool,
    private readonly linkRepo: IntegrationLinkRepository,
    syncJobRepo?: SyncJobPgRepository,
  ) {
    this.portalSync = new PortalSyncOrchestrator(pool, linkRepo)
    this.syncJobRepo = syncJobRepo ?? new SyncJobPgRepository(pool)
    bindSyncJobPersistence(this.syncJobRepo)
  }

  getSyncJobRepository(): SyncJobPgRepository {
    return this.syncJobRepo
  }

  async requestSync(
    link: IntegrationLink,
    opts: IntegrationLinkSyncRequest = {},
  ): Promise<IntegrationLinkSyncResult> {
    const silent = opts.silent ?? false
    const force = opts.force ?? false
    const trigger = opts.trigger ?? 'manual'

    if (!SYNCABLE_PORTALS.has(link.portalType)) {
      return { jobId: null, skipped: true, reason: 'unsupported_portal' }
    }
    if (!link.email || !link.encryptedPassword) {
      return { jobId: null, skipped: true, reason: 'missing_credentials' }
    }

    const lockKey = `${link.patientId}:${link.portalType}`
    const activeDb = await this.syncJobRepo.findActiveByLinkId(link.id)
    if (activeDb) return { jobId: activeDb.id, skipped: true, reason: 'active_job' }
    if (this.syncLocks.has(lockKey)) return { jobId: null, skipped: true, reason: 'lock' }

    if (!force) {
      const lastCompleted = await this.syncJobRepo.findLastCompletedByLinkId(link.id)
      const finishedAt = lastCompleted?.toJSON().finishedAt
      if (
        lastCompleted?.toJSON().status === 'success'
        && finishedAt
        && Date.now() - finishedAt.getTime() < RECENT_SYNC_MS
      ) {
        return { jobId: lastCompleted.id, skipped: true, reason: 'recent_sync' }
      }
    }

    if (silent && !isIntegrationLinkSessionReady(link)) {
      return { jobId: null, skipped: true, reason: 'session_required' }
    }

    const portalDegraded = await getRuntimeDegradedService().isPortalSyncDegraded(link.portalType)
    if (portalDegraded && (silent || trigger === 'scheduled')) {
      return { jobId: null, skipped: true, reason: 'portal_degraded' }
    }

    this.syncLocks.add(lockKey)
    const decryptedPassword = decrypt(link.encryptedPassword)
    const jobId = await createJob(link.portalType as SyncablePortalType, link.id, { trigger })
    const run = () => this.executeSync(link, decryptedPassword, jobId, { silent, force, log: opts.log })

    if (opts.background ?? true) {
      dispatchBackgroundTask(async () => {
        try {
          await run()
        } catch (err) {
          opts.log?.error(err, 'Background sync failed')
        } finally {
          this.syncLocks.delete(lockKey)
        }
      })
      return { jobId }
    }

    try {
      await run()
    } finally {
      this.syncLocks.delete(lockKey)
    }
    return { jobId }
  }

  async runScheduledBatch(log?: FastifyBaseLogger): Promise<ScheduledSyncReport> {
    const links = await this.linkRepo.findSyncableActive()
    const report: ScheduledSyncReport = {
      candidates: links.length,
      started: 0,
      skipped: 0,
      failed: 0,
      items: [],
    }

    for (const link of links) {
      const item: ScheduledSyncItemResult = {
        linkId: link.id,
        portalType: link.portalType,
        patientId: link.patientId,
      }
      try {
        const result = await this.requestSync(link, {
          silent: true,
          force: false,
          trigger: 'scheduled',
          background: false,
          log,
        })
        if (result.jobId) item.jobId = result.jobId
        if (result.skipped) {
          item.skipped = true
          item.reason = result.reason
          report.skipped++
        } else {
          report.started++
        }
      } catch (err) {
        item.error = err instanceof Error ? err.message : String(err)
        report.failed++
      }
      report.items.push(item)
    }

    return report
  }

  private async executeSync(
    link: IntegrationLink,
    decryptedPassword: string,
    jobId: string,
    opts: { silent: boolean; force: boolean; log?: FastifyBaseLogger },
  ): Promise<void> {
    const emit = (step: string, message: string, status: 'running' | 'success' | 'failed') => {
      void updateJob(jobId, { step, message, status })
    }

    try {
      await withBrowserSyncMutex(async () => {
        const patientRepo = new PatientPgRepository(this.pool)
        const patient = await patientRepo.findById(link.patientId)

        if (link.portalType === 'amil') {
          try {
            const { importOutcome, beneficiaryDetails, unmatchedBeneficiaries } =
              await this.portalSync.runAmilSync({
                link,
                decryptedPassword,
                jobId,
                onProgress: emit,
                patientName: patient?.name,
                log: opts.log,
                interactiveLogin: !opts.silent,
                incremental: opts.silent && !opts.force,
              })
            const novelty = noveltyFromImportOutcome(importOutcome)
            const syncResult = attachNoveltyToSyncResult({
              exams: 0,
              medicalRecords: 0,
              authorizations: importOutcome.authorizations,
              authorizationItems: 0,
              updatedAuthorizations: importOutcome.updatedAuthorizations,
              total: importOutcome.imported + importOutcome.updated,
              authorizationDetails: importOutcome.authorizationDetails,
              beneficiaryDetails,
              unmatchedBeneficiaries,
            }, novelty)
            await updateJob(jobId, { step: 'done', message: 'Sincronização Amil concluída', status: 'success' }, syncResult, novelty)
          } catch (err) {
            const message = await this.portalSync.handleAmilSyncFailure(link, err, opts.log)
            await updateJob(jobId, { step: 'error', message, status: 'failed' })
          }
          return
        }

        if (link.portalType === 'mater_dei') {
          await this.runMaterDeiSync(link, decryptedPassword, jobId, emit, opts.log, !opts.silent)
          return
        }

        if (link.portalType === 'hermes_pardini') {
          await this.runHermesPardiniSync(link, decryptedPassword, jobId, emit, opts.log, !opts.silent)
          return
        }

        if (link.portalType === 'bradesco_saude') {
          await this.runBradescoSync(link, decryptedPassword, jobId, emit, patient)
          return
        }

        if (link.portalType === 'unimed') {
          try {
            const { importOutcome, authorizationDetails } = await this.portalSync.runUnimedSync({
              link,
              decryptedPassword,
              jobId,
              onProgress: emit,
              log: opts.log,
              incremental: opts.silent && !opts.force,
            })
            const novelty = noveltyFromImportOutcome(importOutcome)
            const syncResult = attachNoveltyToSyncResult({
              exams: importOutcome.exams,
              medicalRecords: importOutcome.medicalRecords,
              authorizations: importOutcome.authorizations,
              authorizationItems: importOutcome.authorizationItems,
              updatedAuthorizations: importOutcome.updatedAuthorizations,
              total: importOutcome.imported + importOutcome.updated,
              authorizationDetails,
            }, novelty)
            await updateJob(jobId, { step: 'done', message: 'Sincronização concluída', status: 'success' }, syncResult, novelty)
          } catch (err) {
            const message = await this.portalSync.handleUnimedSyncFailure(link, err, opts.log)
            await updateJob(jobId, { step: 'error', message, status: 'failed' })
          }
        }
      })
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro na sincronização'
      opts.log?.error(err, 'Sync failed')
      const message = await applyPortalSyncAuthFailure(link, this.linkRepo, link.portalType, raw)
      const kind = classifyPortalSyncFailure(link.portalType, raw)
      await updateJob(jobId, { step: 'error', message, status: 'failed' }, undefined, undefined, kind)
    }
  }

  private async runMaterDeiSync(
    link: IntegrationLink,
    decryptedPassword: string,
    jobId: string,
    emit: (step: string, message: string, status: 'running' | 'success' | 'failed') => void,
    log?: FastifyBaseLogger,
    interactiveLogin?: boolean,
  ) {
    try {
      const storedSession = link.encryptedSessionToken
        ? decrypt(link.encryptedSessionToken)
        : undefined

      const patientRepo = new PatientPgRepository(this.pool)
      const allPatientsRaw = await patientRepo.findAll()
      const householdIds = collectHouseholdPatientIds(
        link.patientId,
        allPatientsRaw.map((p) => ({ id: p.id, parentIds: p.parentIds })),
      )
      const examStartDate = await computeMaterDeiExamStartDate(this.pool, link, householdIds)

      const scraper = new MaterDeiSyncScraper()
      const result = await scraper.scrape(
        link.email!,
        decryptedPassword,
        (p) => void updateJob(jobId, p),
        {
          sessionJson: storedSession,
          interactiveLogin: interactiveLogin ?? true,
          examStartDate,
        },
      )

      emit('importing', 'Salvando dados Mater Dei...', 'running')

      const recordRepo = new MedicalRecordPgRepository(this.pool)
      const examRepo = new ExamPgRepository(this.pool)
      const matchable: MatchablePatient[] = allPatientsRaw.map((p) => ({
        id: p.id,
        name: p.name,
        cpf: p.cpf,
        cns: p.cns,
        birthDate: p.birthDate,
        parentIds: p.parentIds,
      }))
      const resolveExamPatientId = (exam: MaterDeiExamItem) =>
        resolveMaterDeiPatientId(exam.patientName, link.patientId, matchable)

      const existingRecords = await recordRepo.findAll({ patientId: link.patientId })
      const recordKey = (date: string, desc: string, doctor: string) =>
        `${date}|${normalizeName(doctor)}|${desc}`
      const existingKeys = new Set(
        existingRecords.map((r) =>
          recordKey(
            r.recordDate.toISOString().slice(0, 10),
            r.description || '',
            r.doctorName || '',
          )),
      )

      const existingExamKeysByPatient = new Map<string, Set<string>>()
      for (const p of allPatientsRaw) {
        const exs = await examRepo.findAll({ patientId: p.id })
        existingExamKeysByPatient.set(p.id, new Set(
          exs.map((e) => {
            if (e.notes?.startsWith('mater_dei:')) return e.notes.split('\n')[0]
            return `${e.examType}|${e.examDate.toISOString().slice(0, 10)}`
          }),
        ))
      }

      let importedRecords = 0
      let importedExams = 0
      let skippedExams = 0
      const portalExamCount = result.exams.length
      const portalAttendanceCount = result.attendances.length

      emit(
        'fetch-catalog',
        `Catálogo: ${portalExamCount} exame(s), ${portalAttendanceCount} atendimento(s) no portal — conferindo novidades...`,
        'running',
      )

      for (const att of result.attendances) {
        const parsedDate = att.date ? (parsePortalDate(att.date) ?? parseFlexiblePortalDate(att.date)) : null
        if (!parsedDate) continue
        const desc = att.description || att.type || 'Atendimento Mater Dei'
        const key = recordKey(parsedDate.toISOString().slice(0, 10), desc, att.doctorName || '')
        if (existingKeys.has(key)) continue
        const savedRecord = await recordRepo.save(MedicalRecord.create({
          patientId: link.patientId,
          recordDate: parsedDate,
          recordType: /consult/i.test(att.type || desc) ? 'consulta' : 'outro',
          doctorName: att.doctorName || undefined,
          clinicName: att.unitName || 'Mater Dei',
          description: desc,
          source: 'mater_dei',
          notes: att.id != null ? `ID: ${att.id}` : undefined,
        }))
        scheduleImportLineageProjection({
          patientId: link.patientId,
          processedTable: 'medical_records',
          processedId: savedRecord.id,
          source: 'mater_dei',
        })
        importedRecords++
        existingKeys.add(key)
      }

      for (const exam of result.exams) {
        const parsedDate = exam.examDate
          ? (parsePortalDate(exam.examDate) ?? parseFlexiblePortalDate(exam.examDate))
          : null
        if (!parsedDate) continue
        const dedup = materDeiExamDedupKey(exam)
        const targetPatientId = resolveExamPatientId(exam)
        const patientExamKeys = existingExamKeysByPatient.get(targetPatientId) ?? new Set<string>()
        if (patientExamKeys.has(dedup)) {
          skippedExams++
          continue
        }

        const savedExam = await examRepo.save(Exam.create({
          patientId: targetPatientId,
          examType: exam.examType,
          examDate: parsedDate,
          laboratory: exam.provider || 'Mater Dei',
          resultSummary: exam.status || undefined,
          source: 'mater_dei',
          notes: materDeiExamNotes(dedup, buildMaterDeiExamMeta(exam)),
        }))
        scheduleImportLineageProjection({
          patientId: targetPatientId,
          processedTable: 'exams',
          processedId: savedExam.id,
          source: 'mater_dei',
        })
        importedExams++
        patientExamKeys.add(dedup)
        existingExamKeysByPatient.set(targetPatientId, patientExamKeys)
      }

      emit(
        'fetch-catalog',
        `Novidades: ${importedExams} exame(s) novo(s), ${skippedExams} já conhecido(s)`,
        'success',
      )

      emit('fetch-files', 'Baixando laudos e imagens de exames...', 'running')
      const gatewayPatientId = resolveMaterDeiGatewayPatientId(result.session) ?? 0
      const dlRequest = await playwrightRequest.newContext({ baseURL: MATER_DEI_ORIGIN })
      let downloadedFiles = 0
      let skippedFiles = 0
      try {
        const fileResult = await persistMaterDeiExamFiles({
          pool: this.pool,
          request: dlRequest,
          accessToken: result.session.accessToken,
          gatewayPatientId,
          exams: result.exams,
          resolvePatientId: resolveExamPatientId,
          onProgress: (msg) => emit('fetch-files', msg, 'running'),
        })
        downloadedFiles = fileResult.downloaded
        skippedFiles = fileResult.skipped
      } finally {
        await dlRequest.dispose()
      }
      emit(
        'fetch-files',
        downloadedFiles > 0
          ? `${downloadedFiles} arquivo(s) de exame baixado(s)`
          : 'Laudos/imagens: nada novo para baixar',
        'success',
      )

      const materDeiWarnings: string[] = []
      await this.tryImportExamMeasurements(link.patientId, materDeiWarnings, log)

      link.setSessionToken(
        encrypt(JSON.stringify(result.session)),
        result.session.sessionExpiresAt,
      )
      link.clearAuthAttention()
      link.markSynced()
      await this.linkRepo.update(link)

      const novelty: SyncNoveltySummary = {
        portalExams: portalExamCount,
        portalAttendances: portalAttendanceCount,
        newExamRecords: importedExams,
        skippedExamRecords: skippedExams,
        filesDownloaded: downloadedFiles,
        filesSkipped: skippedFiles,
      }

      const warnings = [...(result.warnings ?? []), ...materDeiWarnings]
      await updateJob(jobId, {
        step: 'done',
        message: warnings.length > 0
          ? `Sincronização concluída: ${importedExams} exame(s), ${downloadedFiles} arquivo(s) (${warnings.length} aviso(s))`
          : `Sincronização Mater Dei concluída (${importedExams} exame(s), ${downloadedFiles} arquivo(s))`,
        status: 'success',
      }, {
        exams: importedExams,
        medicalRecords: importedRecords,
        authorizations: 0,
        authorizationItems: 0,
        updatedAuthorizations: 0,
        total: importedRecords + importedExams,
        authorizationDetails: [],
        warnings: warnings.length > 0 ? warnings : undefined,
        novelty,
      }, novelty)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro na sincronização Mater Dei'
      log?.error(err, 'Mater Dei sync failed')
      const message = await applyPortalSyncAuthFailure(link, this.linkRepo, 'mater_dei', raw)
      const kind = classifyPortalSyncFailure('mater_dei', raw)
      void updateJob(jobId, { step: 'error', message, status: 'failed' }, undefined, undefined, kind)
    }
  }

  private async runHermesPardiniSync(
    link: IntegrationLink,
    decryptedPassword: string,
    jobId: string,
    emit: (step: string, message: string, status: 'running' | 'success' | 'failed') => void,
    log?: FastifyBaseLogger,
    interactiveLogin?: boolean,
  ) {
    try {
      const storedSession = link.encryptedSessionToken
        ? decrypt(link.encryptedSessionToken)
        : undefined

      const patientRepo = new PatientPgRepository(this.pool)
      const allPatientsRaw = await patientRepo.findAll()
      const householdIds = collectHouseholdPatientIds(
        link.patientId,
        allPatientsRaw.map((p) => ({ id: p.id, parentIds: p.parentIds })),
      )
      const examStartDate = await computeHermesPardiniExamStartDate(this.pool, link, householdIds)

      const scraper = new HermesPardiniSyncScraper()
      const result = await scraper.scrape(
        link.email!,
        decryptedPassword,
        (p) => void updateJob(jobId, p),
        {
          sessionJson: storedSession,
          interactiveLogin: interactiveLogin ?? true,
          examStartDate,
          jobId,
        },
      )

      const examRepo = new ExamPgRepository(this.pool)
      const examOrderService = new ExamOrderService(new ExamOrderPgRepository(this.pool))
      const existingExams = await examRepo.findAll({ patientId: link.patientId })
      const existingKeys = new Set(
        existingExams.map((e) => {
          if (e.notes?.startsWith('hermes_pardini:')) return e.notes.split('\n')[0]
          return `${e.examType}|${e.examDate.toISOString().slice(0, 10)}`
        }),
      )

      let importedExams = 0
      let skippedExams = 0
      let skippedNoDate = 0
      let updatedSummaries = 0
      for (const exam of result.exams) {
        const dedup = exam.externalKey
        const parsedDate = exam.performedAt
          ? (parsePortalDate(exam.performedAt) ?? parseFlexiblePortalDate(exam.performedAt))
          : null

        const existing = existingExams.find((e) => e.notes?.split('\n')[0] === dedup)
        if (existing) {
          let examOrderId = existing.examOrderId
          if (!examOrderId && exam.pedidoId && exam.pedidoId !== 'unknown') {
            const order = await examOrderService.upsertFromPortal({
              patientId: link.patientId,
              source: 'hermes_pardini',
              portalOrderId: exam.pedidoId,
              orderDate: parsedDate ?? undefined,
              laboratory: exam.laboratory ?? 'Hermes Pardini',
              portalOrderLabel: exam.pedidoDisplayId,
            })
            examOrderId = order.id
          }
          if ((exam.resultSummary && !existing.resultSummary) || (examOrderId && !existing.examOrderId)) {
            const updated = Exam.restore({
              ...existing.toJSON(),
              examOrderId: examOrderId ?? existing.examOrderId,
              resultSummary: exam.resultSummary && !existing.resultSummary
                ? exam.resultSummary
                : existing.resultSummary,
            })
            await examRepo.update(updated)
            if (exam.resultSummary && !existing.resultSummary) updatedSummaries++
          }
          skippedExams++
          continue
        }

        if (!parsedDate) {
          skippedNoDate++
          continue
        }

        let examOrderId: string | undefined
        if (exam.pedidoId && exam.pedidoId !== 'unknown') {
          const order = await examOrderService.upsertFromPortal({
            patientId: link.patientId,
            source: 'hermes_pardini',
            portalOrderId: exam.pedidoId,
            orderDate: parsedDate,
            laboratory: exam.laboratory ?? 'Hermes Pardini',
            portalOrderLabel: exam.pedidoDisplayId,
          })
          examOrderId = order.id
        }

        const savedExam = await examRepo.save(Exam.create({
          patientId: link.patientId,
          examOrderId,
          examType: exam.name,
          examDate: parsedDate,
          laboratory: exam.laboratory ?? 'Hermes Pardini',
          resultSummary: exam.resultSummary ?? undefined,
          source: 'hermes_pardini',
          notes: hermesPardiniExamNotes(dedup, { pedidoId: exam.pedidoId }, exam.laboratory),
        }))
        scheduleImportLineageProjection({
          patientId: link.patientId,
          processedTable: 'exams',
          processedId: savedExam.id,
          source: 'hermes_pardini',
        })
        importedExams++
        existingKeys.add(dedup)
      }

      emit('fetch-files', 'Baixando laudos PDF…', 'running')
      const dlRequest = await playwrightRequest.newContext()
      let downloadedFiles = 0
      let skippedFiles = 0
      let pdfPersistWarning: string | undefined
      try {
        const fileResult = await persistHermesPardiniLaudos({
          pool: this.pool,
          request: dlRequest,
          accessToken: result.session.accessToken,
          headerProfile: result.session.pacienteApiHeaders,
          patientId: link.patientId,
          exams: result.exams,
          onProgress: (msg) => emit('fetch-files', msg, 'running'),
        })
        downloadedFiles = fileResult.downloaded
        skippedFiles = fileResult.skipped
      } catch (fileErr) {
        const msg = fileErr instanceof Error ? fileErr.message : String(fileErr)
        pdfPersistWarning = `Laudos PDF não gravados: ${msg.slice(0, 120)}`
        log?.warn(fileErr, 'Hermes Pardini PDF persist failed')
        emit('fetch-files', pdfPersistWarning, 'running')
      } finally {
        await dlRequest.dispose()
      }
      emit(
        'fetch-files',
        downloadedFiles > 0
          ? `${downloadedFiles} laudo(s) PDF baixado(s)`
          : pdfPersistWarning
            ? 'Exames importados — laudos PDF não gravados'
            : 'Laudos PDF: nada novo para baixar',
        'success',
      )

      const hermesMeasurementWarnings: string[] = []
      await this.tryImportExamMeasurements(link.patientId, hermesMeasurementWarnings, log)

      link.setSessionToken(
        encrypt(JSON.stringify(result.session)),
        result.session.sessionExpiresAt,
      )
      link.clearAuthAttention()
      link.markSynced()
      await this.linkRepo.update(link)

      const warnings = [...result.warnings, ...hermesMeasurementWarnings]
      if (pdfPersistWarning) warnings.push(pdfPersistWarning)
      if (skippedNoDate > 0) {
        warnings.push(`${skippedNoDate} exame(s) sem data válida — não importados`)
      }
      if (updatedSummaries > 0) {
        warnings.push(`${updatedSummaries} exame(s) atualizados com resumo do portal`)
      }
      const novelty: SyncNoveltySummary = {
        portalExams: result.exams.length,
        newExamRecords: importedExams,
        skippedExamRecords: skippedExams,
        filesDownloaded: downloadedFiles > 0 ? downloadedFiles : undefined,
        filesSkipped: skippedFiles > 0 ? skippedFiles : undefined,
      }

      await updateJob(jobId, {
        step: 'done',
        message: importedExams > 0
          ? `Hermes Pardini: ${importedExams} exame(s) importado(s)`
          : warnings.length > 0
            ? `Hermes Pardini: sessão OK (${warnings[0]})`
            : 'Hermes Pardini: sincronização concluída',
        status: 'success',
      }, {
        exams: importedExams,
        medicalRecords: 0,
        authorizations: 0,
        authorizationItems: 0,
        updatedAuthorizations: 0,
        total: importedExams,
        authorizationDetails: [],
        warnings: warnings.length > 0 ? warnings : undefined,
        novelty,
      }, novelty)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro na sincronização Hermes Pardini'
      log?.error(err, 'Hermes Pardini sync failed')
      const message = await applyPortalSyncAuthFailure(link, this.linkRepo, 'hermes_pardini', raw)
      const kind = classifyPortalSyncFailure('hermes_pardini', raw)
      void updateJob(jobId, { step: 'error', message, status: 'failed' }, undefined, undefined, kind)
    }
  }

  private async runBradescoSync(
    link: IntegrationLink,
    decryptedPassword: string,
    jobId: string,
    emit: (step: string, message: string, status: 'running' | 'success' | 'failed') => void,
    patient: Patient | null,
  ) {
    try {
      if (!patient?.cpf) {
        throw new Error('CPF do paciente é obrigatório para sync Bradesco Saúde')
      }
      emit('login', 'Abrindo Bradesco Saúde (agente)...', 'running')
      const scraper = new AgenticScraperService()
      const result = await scraper.scrape('bradesco_saude', {
        cpf: patient.cpf.replace(/\D/g, ''),
        email: link.email ?? undefined,
        password: decryptedPassword,
      }, (p) => emit(p.step, p.message, p.status))

      const examRepo = new ExamPgRepository(this.pool)
      const vaccineRepo = new VaccinePgRepository(this.pool)
      const existingExams = await examRepo.findAll({ patientId: link.patientId })
      const examKeys = new Set(existingExams.map((e) => `${e.examType}|${e.examDate.toISOString().slice(0, 10)}`))
      let importedExams = 0
      for (const item of result.exams) {
        const date = parsePortalDate(item.examDate) ?? parseFlexiblePortalDate(item.examDate)
        if (!date || !item.examType) continue
        const key = `${item.examType}|${date.toISOString().slice(0, 10)}`
        if (examKeys.has(key)) continue
        await examRepo.save(Exam.create({
          patientId: link.patientId,
          examType: item.examType,
          examDate: date,
          resultSummary: item.results ?? item.description ?? undefined,
          source: 'bradesco_saude',
        }))
        examKeys.add(key)
        importedExams++
      }

      const existingVaccines = await vaccineRepo.findAll({ patientId: link.patientId })
      const vaccineKeys = new Set(
        existingVaccines.map((v) => `${v.vaccineName}|${v.applicationDate.toISOString().slice(0, 10)}`),
      )
      let importedVaccines = 0
      for (const item of result.vaccines) {
        const date = parsePortalDate(item.applicationDate) ?? parseFlexiblePortalDate(item.applicationDate)
        if (!date || !item.vaccineName) continue
        const key = `${item.vaccineName}|${date.toISOString().slice(0, 10)}`
        if (vaccineKeys.has(key)) continue
        await vaccineRepo.save(Vaccine.create({
          patientId: link.patientId,
          vaccineName: item.vaccineName,
          applicationDate: date,
          batchNumber: item.batch ?? undefined,
          appliedBy: item.appliedBy ?? undefined,
          clinic: item.clinic ?? undefined,
          source: 'bradesco_saude',
        }))
        vaccineKeys.add(key)
        importedVaccines++
      }

      link.markSynced()
      await this.linkRepo.update(link)

      const total = importedExams + importedVaccines
      void updateJob(jobId, {
        step: 'done',
        message: `Bradesco: ${importedExams} exame(s), ${importedVaccines} vacina(s)`,
        status: 'success',
      }, {
        exams: importedExams,
        medicalRecords: 0,
        authorizations: 0,
        authorizationItems: 0,
        updatedAuthorizations: 0,
        total,
        authorizationDetails: [],
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na sincronização Bradesco'
      void updateJob(jobId, { step: 'error', message, status: 'failed' })
    }
  }

  private async tryImportExamMeasurements(
    patientId: string,
    warnings: string[],
    log?: FastifyBaseLogger,
  ): Promise<void> {
    try {
      const { glucose } = await runExamMeasurementImport(this.pool, patientId)
      if (glucose.imported > 0) {
        warnings.push(`${glucose.imported} glicemia(s) importada(s) do OCR dos exames`)
      }
      const hygienePairs = await runHygieneScanForPatient(this.pool, patientId)
      if (hygienePairs > 0) {
        warnings.push(`${hygienePairs} possível(is) duplicata(s) de exame/vacina para revisar`)
      }
    } catch (err) {
      log?.warn(err, 'exam measurement import after sync failed')
    }
  }
}
