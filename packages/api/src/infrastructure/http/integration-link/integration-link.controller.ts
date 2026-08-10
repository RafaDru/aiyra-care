import type { FastifyReply } from 'fastify'
import type { Pool } from 'pg'
import type { IntegrationLinkRepository } from '../../../domain/integration-link/integration-link.repository.js'
import { IntegrationLink } from '../../../domain/integration-link/integration-link.entity.js'
import { createIntegrationLinkSchema, updateIntegrationLinkSchema, integrationLinkParamsSchema, integrationLinkQuerySchema, syncLinkQuerySchema } from './integration-link.schema.js'
import { UnimedBhCartaoVirtualScraper } from '../../scraper/unimedbh-cartao-virtual.scraper.js'
import { MaterDeiSyncScraper, MATER_DEI_ORIGIN, resolveMaterDeiGatewayPatientId } from '../../scraper/materdei-sync.scraper.js'
import { HermesPardiniSyncScraper } from '../../scraper/hermes-pardini-sync.scraper.js'
import { materDeiExamDedupKey } from '../../scraper/materdei-exam.mapper.js'
import { resolveMaterDeiPatientId } from '../../scraper/materdei-patient-resolver.js'
import {
  buildMaterDeiExamMeta,
  materDeiExamNotes,
  persistMaterDeiExamFiles,
} from '../../scraper/materdei-exam-persist.js'
import type { MaterDeiExamItem } from '../../scraper/materdei-exam.mapper.js'
import { request as playwrightRequest } from 'playwright'
import { Exam } from '../../../domain/exam/exam.entity.js'
import { MedicalRecord } from '../../../domain/medical-record/medical-record.entity.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { MedicalRecordPgRepository } from '../../persistence/medical-record.pg.repository.js'
import { createJob, updateJob, getJob, removeJob, bindSyncJobPersistence, getJobProgressPayload, type SyncProgressPayload } from '../../scraper/sync-progress-store.js'
import { subscribeSyncJob } from '../../scraper/sync-job-stream.js'
import { SyncJobPgRepository } from '../../persistence/sync-job.pg.repository.js'
import type { SyncNoveltySummary } from '../../../domain/sync-job/sync-job.entity.js'
import { dispatchBackgroundTask } from '../../sync/background-dispatch.js'
import { encrypt, decrypt } from '../../crypto-helper.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { InsurancePlanService } from '../../../application/insurance-plan/insurance-plan.service.js'
import { InsurancePlanPgRepository } from '../../persistence/insurance-plan.pg.repository.js'
import { PlanMembershipPgRepository } from '../../persistence/plan-membership.pg.repository.js'
import type { MatchablePatient } from '../../../application/insurance-plan/amil-beneficiary-matcher.js'
import type { SyncablePortalType } from '../../../domain/scraper/sync-portal-profile.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, isAuthEnforcementEnabled } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'
import { PortalSyncOrchestrator } from '../../../application/connect/portal-sync.orchestrator.js'
import { attachNoveltyToSyncResult, noveltyFromImportOutcome } from '../../../application/connect/sync-novelty.helper.js'
import {
  computeMaterDeiExamStartDate,
  collectHouseholdPatientIds,
} from '../../../application/connect/sync-delta.helper.js'
import { enrichIntegrationLinksWithSyncAuthority } from '../../../application/integration-link/integration-link-sync-authority.js'
import { isIntegrationLinkSessionReady } from '../../../application/integration-link/integration-link-session.js'

const syncLocks = new Set<string>()

const RECENT_SYNC_MS = Number(process.env.SYNC_MIN_INTERVAL_MS ?? String(30 * 60 * 1000))
const SYNC_STREAM_HEARTBEAT_MS = Number(process.env.SYNC_STREAM_HEARTBEAT_MS ?? '25000')

function syncJobToStatusPayload(job: ReturnType<SyncJobPgRepository['findById']> extends Promise<infer T> ? NonNullable<T> : never) {
  const d = job.toJSON()
  return {
    id: d.id,
    status: d.status,
    step: d.step,
    message: d.message,
    stepDetails: d.stepDetails,
    result: d.result,
    novelty: d.novelty,
    error: d.error,
    startedAt: d.startedAt.toISOString(),
    finishedAt: d.finishedAt?.toISOString() ?? null,
    portalType: d.portalType,
  }
}

export class IntegrationLinkController {
  private readonly syncJobRepo: SyncJobPgRepository
  private readonly portalSync: PortalSyncOrchestrator

  constructor(
    private readonly repo: IntegrationLinkRepository,
    private readonly pool: Pool,
  ) {
    this.syncJobRepo = new SyncJobPgRepository(pool)
    bindSyncJobPersistence(this.syncJobRepo)
    this.portalSync = new PortalSyncOrchestrator(pool, repo)
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createIntegrationLinkSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const { password, ...rest } = parsed.data
    const encryptedPassword = password ? encrypt(password) : undefined
    const link = IntegrationLink.create({ ...rest, encryptedPassword })
    const saved = await this.repo.save(link)
    return reply.status(201).send({ ...saved.toJSON(), encryptedPassword: undefined })
  }

  async findByPatient(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = integrationLinkQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    if (!assertPatientAccess(req, reply, query.data.patientId)) return
    const links = await this.repo.findAllByPatient(query.data.patientId)
    const enriched = await enrichIntegrationLinksWithSyncAuthority(this.pool, query.data.patientId, links)
    return reply.send(enriched.map((l) => ({
      ...l,
      encryptedPassword: undefined,
      sessionExpiresAt: l.sessionExpiresAt?.toISOString() ?? null,
      effectiveSessionExpiresAt: l.effectiveSessionExpiresAt?.toISOString() ?? null,
      lastSyncAt: l.lastSyncAt?.toISOString() ?? null,
      effectiveLastSyncAt: l.effectiveLastSyncAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateIntegrationLinkSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const existing = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(params.data.id),
      'Integration link not found',
    )
    if (!existing) return
    const data = existing.toJSON()
    const updated = IntegrationLink.restore({
      ...data,
      email: body.data.email ?? data.email,
      encryptedPassword: body.data.password ? encrypt(body.data.password) : data.encryptedPassword,
      cardNumber: body.data.cardNumber ?? data.cardNumber,
      active: body.data.active ?? data.active,
      updatedAt: new Date(),
    })
    const saved = await this.repo.update(updated)
    return reply.send({ ...saved.toJSON(), encryptedPassword: undefined })
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = integrationLinkParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const existing = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(parsed.data.id),
      'Integration link not found',
    )
    if (!existing) return
    await this.repo.delete(parsed.data.id)
    return reply.status(204).send()
  }

  async sync(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const query = syncLinkQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    const silent = query.data.silent ?? false
    const force = query.data.force ?? false

    const link = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(params.data.id),
      'Integration link not found',
    )
    if (!link) return
    if (!['unimed', 'amil', 'mater_dei', 'hermes_pardini'].includes(link.portalType)) {
      return reply.status(400).send({ message: `Sincronização automática ainda não disponível para ${link.portalType}` })
    }
    if (!link.email || !link.encryptedPassword) return reply.status(400).send({ message: 'Credenciais incompletas' })
    const decryptedPassword = decrypt(link.encryptedPassword)

    const lockKey = `${link.patientId}:${link.portalType}`
    const activeDb = await this.syncJobRepo.findActiveByLinkId(link.id)
    if (activeDb) return reply.status(429).send({ message: 'Sincronização já em andamento' })
    if (syncLocks.has(lockKey)) return reply.status(429).send({ message: 'Sincronização já em andamento' })

    if (!force) {
      const lastCompleted = await this.syncJobRepo.findLastCompletedByLinkId(link.id)
      if (
        lastCompleted?.toJSON().status === 'success'
        && lastCompleted.toJSON().finishedAt
        && Date.now() - lastCompleted.toJSON().finishedAt!.getTime() < RECENT_SYNC_MS
      ) {
        return reply.send({
          jobId: lastCompleted.id,
          skipped: true,
          reason: 'recent_sync',
          silent,
        })
      }
    }

    if (silent && !isIntegrationLinkSessionReady(link)) {
      return reply.send({
        jobId: null,
        skipped: true,
        reason: 'session_required',
        silent,
      })
    }

    syncLocks.add(lockKey)

    const jobId = createJob(link.portalType as SyncablePortalType, link.id)
    const emit = (step: string, message: string, status: 'running' | 'success' | 'failed') => {
      updateJob(jobId, { step, message, status })
    }

    dispatchBackgroundTask(async () => {
      try {
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
                log: req.log,
                interactiveLogin: !silent,
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
            updateJob(jobId, { step: 'done', message: 'Sincronização Amil concluída', status: 'success' }, syncResult, novelty)
          } catch (err) {
            const message = await this.portalSync.handleAmilSyncFailure(link, err, req.log)
            updateJob(jobId, { step: 'error', message, status: 'failed' })
          }
          setTimeout(() => removeJob(jobId), 120000)
          return
        }

        if (link.portalType === 'mater_dei') {
          await this.runMaterDeiSync({
            link,
            decryptedPassword,
            jobId,
            emit,
            req,
            interactiveLogin: !silent,
          })
          return
        }

        if (link.portalType === 'hermes_pardini') {
          await this.runHermesPardiniSync({
            link,
            decryptedPassword,
            jobId,
            emit,
            req,
            interactiveLogin: !silent,
          })
          return
        }

        if (link.portalType === 'unimed') {
          try {
            const { importOutcome, authorizationDetails } = await this.portalSync.runUnimedSync({
              link,
              decryptedPassword,
              jobId,
              onProgress: emit,
              log: req.log,
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
            updateJob(jobId, { step: 'done', message: 'Sincronização concluída', status: 'success' }, syncResult, novelty)
          } catch (err) {
            const message = await this.portalSync.handleUnimedSyncFailure(link, err, req.log)
            updateJob(jobId, { step: 'error', message, status: 'failed' })
          }
          setTimeout(() => removeJob(jobId), 120000)
          return
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro na sincronização'
        req.log.error(err, 'Sync failed')
        if (/login|autentic|acesso\.unimed|sess[aã]o|portal do cliente/i.test(message)) {
          link.clearSessionToken()
          await this.repo.update(link).catch(() => {})
        }
        updateJob(jobId, { step: 'error', message, status: 'failed' })
        setTimeout(() => removeJob(jobId), 120000)
      } finally {
        syncLocks.delete(lockKey)
      }
    })

    return reply.send({ jobId, silent })
  }

  private async runMaterDeiSync(args: {
    link: IntegrationLink
    decryptedPassword: string
    jobId: string
    emit: (step: string, message: string, status: 'running' | 'success' | 'failed') => void
    req: AuthenticatedRequest
    interactiveLogin?: boolean
  }) {
    const { link, decryptedPassword, jobId, emit, req, interactiveLogin } = args
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
        (p) => updateJob(jobId, p),
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
        const parsedDate = att.date ? (parseDate(att.date) ?? parseFlexibleDate(att.date)) : null
        if (!parsedDate) continue
        const desc = att.description || att.type || 'Atendimento Mater Dei'
        const key = recordKey(parsedDate.toISOString().slice(0, 10), desc, att.doctorName || '')
        if (existingKeys.has(key)) continue
        await recordRepo.save(MedicalRecord.create({
          patientId: link.patientId,
          recordDate: parsedDate,
          recordType: /consult/i.test(att.type || desc) ? 'consulta' : 'outro',
          doctorName: att.doctorName || undefined,
          clinicName: att.unitName || 'Mater Dei',
          description: desc,
          source: 'mater_dei',
          notes: att.id != null ? `ID: ${att.id}` : undefined,
        }))
        importedRecords++
        existingKeys.add(key)
      }

      for (const exam of result.exams) {
        const parsedDate = exam.examDate
          ? (parseDate(exam.examDate) ?? parseFlexibleDate(exam.examDate))
          : null
        if (!parsedDate) continue
        const dedup = materDeiExamDedupKey(exam)
        const targetPatientId = resolveExamPatientId(exam)
        const patientExamKeys = existingExamKeysByPatient.get(targetPatientId) ?? new Set<string>()
        if (patientExamKeys.has(dedup)) {
          skippedExams++
          continue
        }

        await examRepo.save(Exam.create({
          patientId: targetPatientId,
          examType: exam.examType,
          examDate: parsedDate,
          laboratory: exam.provider || 'Mater Dei',
          resultSummary: exam.status || undefined,
          source: 'mater_dei',
          notes: materDeiExamNotes(dedup, buildMaterDeiExamMeta(exam)),
        }))
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

      link.setSessionToken(
        encrypt(JSON.stringify(result.session)),
        result.session.sessionExpiresAt,
      )
      link.markSynced()
      await this.repo.update(link)

      const novelty: SyncNoveltySummary = {
        portalExams: portalExamCount,
        portalAttendances: portalAttendanceCount,
        newExamRecords: importedExams,
        skippedExamRecords: skippedExams,
        filesDownloaded: downloadedFiles,
        filesSkipped: skippedFiles,
      }

      const warnings = result.warnings ?? []
      updateJob(jobId, {
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
      setTimeout(() => removeJob(jobId), 120000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na sincronização Mater Dei'
      req.log.error(err, 'Mater Dei sync failed')
      if (/401|403|sess[aã]o|token|expirad|login/i.test(message)) {
        link.clearSessionToken()
        await this.repo.update(link).catch(() => {})
      }
      updateJob(jobId, { step: 'error', message, status: 'failed' })
      setTimeout(() => removeJob(jobId), 120000)
    }
  }

  private async runHermesPardiniSync(args: {
    link: IntegrationLink
    decryptedPassword: string
    jobId: string
    emit: (step: string, message: string, status: 'running' | 'success' | 'failed') => void
    req: AuthenticatedRequest
    interactiveLogin?: boolean
  }) {
    const { link, decryptedPassword, jobId, emit, req, interactiveLogin } = args
    try {
      const storedSession = link.encryptedSessionToken
        ? decrypt(link.encryptedSessionToken)
        : undefined

      const scraper = new HermesPardiniSyncScraper()
      const result = await scraper.scrape(
        link.email!,
        decryptedPassword,
        (p) => updateJob(jobId, p),
        {
          sessionJson: storedSession,
          interactiveLogin: interactiveLogin ?? true,
        },
      )

      const examRepo = new ExamPgRepository(this.pool)
      const existingExams = await examRepo.findAll({ patientId: link.patientId })
      const existingKeys = new Set(
        existingExams.map((e) => {
          if (e.notes?.startsWith('hermes_pardini:')) return e.notes.split('\n')[0]
          return `${e.examType}|${e.examDate.toISOString().slice(0, 10)}`
        }),
      )

      let importedExams = 0
      let skippedExams = 0
      for (const exam of result.exams) {
        const dedup = exam.externalKey
        if (existingKeys.has(dedup)) {
          skippedExams++
          continue
        }
        const parsedDate = exam.performedAt
          ? (parseDate(exam.performedAt) ?? parseFlexibleDate(exam.performedAt))
          : null
        if (!parsedDate) continue
        await examRepo.save(Exam.create({
          patientId: link.patientId,
          examType: exam.name,
          examDate: parsedDate,
          laboratory: 'Hermes Pardini',
          source: 'hermes_pardini',
          notes: dedup,
        }))
        importedExams++
        existingKeys.add(dedup)
      }

      link.setSessionToken(
        encrypt(JSON.stringify(result.session)),
        result.session.sessionExpiresAt,
      )
      link.markSynced()
      await this.repo.update(link)

      const warnings = result.warnings
      const novelty: SyncNoveltySummary = {
        portalExams: result.exams.length,
        newExamRecords: importedExams,
        skippedExamRecords: skippedExams,
      }

      updateJob(jobId, {
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
        postLoginUrl: result.postLoginUrl,
        discoveredPath: result.discoveredPath,
        novelty,
      }, novelty)
      setTimeout(() => removeJob(jobId), 120000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na sincronização Hermes Pardini'
      req.log.error(err, 'Hermes Pardini sync failed')
      if (/401|403|sess[aã]o|token|expirad|login|invalid_grant/i.test(message)) {
        link.clearSessionToken()
        await this.repo.update(link).catch(() => {})
      }
      updateJob(jobId, { step: 'error', message, status: 'failed' })
      setTimeout(() => removeJob(jobId), 120000)
    }
  }

  async virtualCard(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const link = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(params.data.id),
      'Integration link not found',
    )
    if (!link) return
    if (link.portalType !== 'unimed') {
      return reply.status(400).send({ message: 'QR Code / token disponível apenas para Unimed BH' })
    }
    if (!link.email || !link.encryptedPassword) {
      return reply.status(400).send({ message: 'Credenciais incompletas' })
    }

    const lockKey = `virtual-card:${link.patientId}:${link.portalType}`
    if (syncLocks.has(lockKey)) return reply.status(429).send({ message: 'Geração de token já em andamento' })
    syncLocks.add(lockKey)

    try {
      const patientRepo = new PatientPgRepository(this.pool)
      const patient = await patientRepo.findById(link.patientId)
      const storedUnimedState =
        link.encryptedSessionToken && isIntegrationLinkSessionReady(link)
          ? decrypt(link.encryptedSessionToken)
          : undefined
      const scraper = new UnimedBhCartaoVirtualScraper()
      const card = await scraper.scrape(link.email, decrypt(link.encryptedPassword), {
        patientName: patient?.name,
        cardNumber: link.cardNumber || undefined,
        storageStateJson: storedUnimedState,
      })

      if (card.cardNumber && card.cardNumber !== link.cardNumber) {
        link.setCardNumber(card.cardNumber)
        await this.repo.update(link)
      }

      const planService = new InsurancePlanService(
        new InsurancePlanPgRepository(this.pool),
        new PlanMembershipPgRepository(this.pool),
      )
      const planResult = await planService.upsertFromPortal(link.patientId, {
        operator: 'unimed',
        operatorName: card.operatorName || 'Unimed BH',
        planName: card.planName || 'Plano Unimed BH',
        productCode: card.productCode || undefined,
        networkName: card.networkName || undefined,
        segmentation: card.segmentation || undefined,
        accommodation: card.accommodation || undefined,
        geographicCoverage: card.geographicCoverage || undefined,
        regulationType: card.regulationType || undefined,
        contractType: card.contractType || undefined,
        contractorName: card.contractorName || undefined,
        addOns: card.addOns,
        externalKey: card.externalKey,
        source: 'unimed',
        raw: card.raw,
        memberNumber: card.cardNumber || undefined,
        role: 'holder',
        status: 'active',
        cns: card.cns || undefined,
        inclusionDate: card.inclusionDate ? new Date(card.inclusionDate) : null,
        cardValidFrom: card.cardValidFrom ? new Date(card.cardValidFrom) : null,
        cardValidTo: card.cardValidTo ? new Date(card.cardValidTo) : null,
      }, link.id)

      return reply.send({ ...card, plan: planResult.plan, membership: planResult.membership })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar QR Code / token Unimed'
      req.log.error(err, 'Virtual card failed')
      return reply.status(502).send({ message })
    } finally {
      syncLocks.delete(lockKey)
    }
  }

  async syncProgress(req: AuthenticatedRequest, reply: FastifyReply) {
    const { jobId } = req.params as { jobId: string }
    const job = getJob(jobId)
    const dbJob = await this.syncJobRepo.findById(jobId)
    if (!job && !dbJob) return reply.status(404).send({ message: 'Job not found' })

    const linkId = dbJob?.integrationLinkId ?? job?.integrationLinkId
    if (linkId) {
      const guarded = await guardPatientEntity(
        req,
        reply,
        await this.repo.findById(linkId),
        'Integration link not found',
      )
      if (!guarded) return
    } else if (isAuthEnforcementEnabled()) {
      return reply.status(403).send({ message: 'Acesso negado' })
    }

    const payload = getJobProgressPayload(jobId, 'snapshot')
    if (payload) return reply.send(payload)

    const d = dbJob!.toJSON()
    return reply.send({
      step: d.step ?? 'pending',
      message: d.message ?? '',
      status: d.status === 'failed' ? 'failed' : d.status === 'success' ? 'success' : 'running',
      portalType: d.portalType,
      result: d.result,
      stepDetails: d.stepDetails,
      novelty: d.novelty,
      event: 'snapshot',
    })
  }

  async syncProgressStream(req: AuthenticatedRequest, reply: FastifyReply) {
    const { jobId } = req.params as { jobId: string }
    const job = getJob(jobId)
    const dbJob = await this.syncJobRepo.findById(jobId)
    if (!job && !dbJob) return reply.status(404).send({ message: 'Job not found' })

    const linkId = dbJob?.integrationLinkId ?? job?.integrationLinkId
    if (linkId) {
      const guarded = await guardPatientEntity(
        req,
        reply,
        await this.repo.findById(linkId),
        'Integration link not found',
      )
      if (!guarded) return
    } else if (isAuthEnforcementEnabled()) {
      return reply.status(403).send({ message: 'Acesso negado' })
    }

    const res = reply.raw
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('\n')

    const writeEvent = (event: string, payload: SyncProgressPayload) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    const memoryPayload = getJobProgressPayload(jobId, 'snapshot')
    if (memoryPayload) {
      writeEvent('snapshot', memoryPayload)
    } else if (dbJob) {
      const d = dbJob.toJSON()
      writeEvent('snapshot', {
        step: d.step ?? 'pending',
        message: d.message ?? '',
        status: d.status === 'failed' ? 'failed' : d.status === 'success' ? 'success' : 'running',
        portalType: d.portalType as SyncablePortalType | undefined,
        result: d.result,
        stepDetails: d.stepDetails ?? undefined,
        novelty: d.novelty ?? undefined,
        event: 'snapshot',
      })
    }

    const unsub = subscribeSyncJob(jobId, (payload) => {
      writeEvent(payload.event ?? 'progress', payload)
    })

    const heartbeat = setInterval(() => {
      const live = getJobProgressPayload(jobId)
      writeEvent('heartbeat', {
        step: live?.step ?? 'pending',
        message: live?.message ?? '',
        status: live?.status ?? 'running',
        portalType: live?.portalType,
        event: 'heartbeat',
      })
    }, SYNC_STREAM_HEARTBEAT_MS)

    req.raw.on('close', () => {
      clearInterval(heartbeat)
      unsub()
    })
  }

  async syncStatus(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const link = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(params.data.id),
      'Integration link not found',
    )
    if (!link) return

    const active = await this.syncJobRepo.findActiveByLinkId(link.id)
    const last = await this.syncJobRepo.findLastCompletedByLinkId(link.id)

    return reply.send({
      activeJob: active ? syncJobToStatusPayload(active) : null,
      lastJob: last ? syncJobToStatusPayload(last) : null,
    })
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const iso = parseDate(dateStr)
  if (iso) return iso
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(dateStr)
  if (m) {
    const d = new Date(`${m[1]}T12:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

function normalizeName(name: string | null | undefined): string {
  return (name || '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim()
}
