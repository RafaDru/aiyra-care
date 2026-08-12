import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import { allKnownSyncStepKeys, type SyncablePortalType } from '../../domain/scraper/sync-portal-profile.js'
import { SyncJob as SyncJobEntity, type SyncJobStatus, type SyncJobTrigger, type SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'
import type { SyncJobPgRepository } from '../persistence/sync-job.pg.repository.js'
import { publishSyncJobEvent } from './sync-job-stream.js'
import { notifySyncJobTerminal } from '../sync/sync-completion.bus.js'

export interface SyncAuthorizationDetail {
  solicitationNumber?: string
  classification?: string
  doctorName?: string
  itemCount: number
  action: 'created' | 'updated'
  linkedConsultaId?: string
  linkedConsultaDate?: string
  beneficiaryName?: string
}

export interface SyncBeneficiaryDetail {
  name: string
  marcaOtica: string
  role: 'holder' | 'dependent'
  matched: boolean
  patientId?: string
  patientName?: string
  authorizationsImported: number
  authorizationsUpdated: number
}

export interface SyncUnmatchedBeneficiary {
  name: string
  marcaOtica: string
  cpf?: string
  cns?: string
  birthDate?: string
  role: 'holder' | 'dependent'
  authorizationCount: number
}

export interface SyncStepDetail {
  status: 'running' | 'success' | 'failed'
  message: string
}

export interface SyncResult {
  exams: number
  medicalRecords: number
  authorizations: number
  authorizationItems: number
  updatedAuthorizations: number
  total: number
  authorizationDetails: SyncAuthorizationDetail[]
  beneficiaryDetails?: SyncBeneficiaryDetail[]
  unmatchedBeneficiaries?: SyncUnmatchedBeneficiary[]
  /** Falhas parciais durante busca/import — sync pode ter salvado parte dos dados. */
  warnings?: string[]
  novelty?: SyncNoveltySummary
}

export interface SyncJob {
  portalType?: SyncablePortalType
  integrationLinkId?: string
  progress: ScraperProgress
  result?: SyncResult
  stepDetails: Record<string, SyncStepDetail>
}

export type SyncProgressEventKind = 'progress' | 'heartbeat' | 'snapshot' | 'completed' | 'failed'

export interface SyncProgressPayload {
  step: string
  message: string
  status: 'running' | 'success' | 'failed'
  portalType?: SyncablePortalType
  result?: SyncResult
  stepDetails?: Record<string, SyncStepDetail>
  novelty?: SyncNoveltySummary
  event?: SyncProgressEventKind
}

const TRACKED_STEPS = new Set(allKnownSyncStepKeys())

function trackStep(
  stepDetails: Record<string, SyncStepDetail>,
  progress: ScraperProgress,
): Record<string, SyncStepDetail> {
  if (!TRACKED_STEPS.has(progress.step) && !progress.step.startsWith('fetch-')) {
    return stepDetails
  }
  const next: Record<string, SyncStepDetail> = {
    ...stepDetails,
    [progress.step]: {
      status: progress.status === 'failed' ? 'failed' : progress.status === 'success' ? 'success' : 'running',
      message: progress.message,
    },
  }
  const login = next.login
  if (
    login?.status === 'running'
    && (progress.step.startsWith('fetch-') || progress.step === 'importing' || progress.step === 'done')
  ) {
    next.login = { status: 'success', message: login.message }
  }
  return next
}

let syncJobRepo: SyncJobPgRepository | null = null

export function bindSyncJobPersistence(repo: SyncJobPgRepository): void {
  syncJobRepo = repo
}

function requireRepo(): SyncJobPgRepository {
  if (!syncJobRepo) throw new Error('sync_jobs persistence not bound — call bindSyncJobPersistence')
  return syncJobRepo
}

function mapPersistedStatus(progress: ScraperProgress): SyncJobStatus {
  if (progress.step === 'error' || progress.status === 'failed') return 'failed'
  if (progress.step === 'done' && progress.status === 'success') return 'success'
  if (progress.step === 'pending') return 'pending'
  return 'running'
}

function progressStatusFromEntity(status: SyncJobStatus, step: string | null): ScraperProgress['status'] {
  if (status === 'failed' || step === 'error') return 'failed'
  if (status === 'success' && step === 'done') return 'success'
  return 'running'
}

function entityToStoreJob(entity: SyncJobEntity): SyncJob {
  const d = entity.toJSON()
  return {
    portalType: d.portalType as SyncablePortalType,
    integrationLinkId: d.integrationLinkId,
    progress: {
      step: d.step ?? 'pending',
      message: d.message ?? '',
      status: progressStatusFromEntity(d.status, d.step),
    },
    result: d.result ?? undefined,
    stepDetails: (d.stepDetails ?? {}) as Record<string, SyncStepDetail>,
  }
}

export function entityToSyncProgressPayload(
  entity: SyncJobEntity,
  event?: SyncProgressEventKind,
): SyncProgressPayload {
  const d = entity.toJSON()
  const status = progressStatusFromEntity(d.status, d.step)
  return {
    step: d.step ?? 'pending',
    message: d.message ?? '',
    status,
    portalType: d.portalType as SyncablePortalType,
    result: d.result ?? undefined,
    stepDetails: (d.stepDetails ?? {}) as Record<string, SyncStepDetail>,
    novelty: d.novelty ?? d.result?.novelty ?? undefined,
    event,
  }
}

function jobToPayload(job: SyncJob, event?: SyncProgressEventKind): SyncProgressPayload {
  return {
    ...job.progress,
    portalType: job.portalType,
    result: job.result,
    stepDetails: job.stepDetails,
    novelty: job.result?.novelty,
    event,
  }
}

export async function getJobProgressPayload(
  id: string,
  event?: SyncProgressEventKind,
): Promise<SyncProgressPayload | undefined> {
  const job = await getJob(id)
  if (!job) return undefined
  return jobToPayload(job, event)
}

export async function createJob(
  portalType?: SyncablePortalType,
  integrationLinkId?: string,
  opts?: { trigger?: SyncJobTrigger },
): Promise<string> {
  const repo = requireRepo()
  const id = crypto.randomUUID()
  const initial: SyncJob = {
    portalType,
    integrationLinkId,
    progress: { step: 'pending', message: 'Aguardando...', status: 'running' },
    stepDetails: {},
  }

  if (integrationLinkId) {
    const entity = SyncJobEntity.create({
      id,
      integrationLinkId,
      portalType: portalType ?? 'unknown',
      trigger: opts?.trigger ?? 'manual',
    })
    await repo.save(entity)
  }

  publishSyncJobEvent(id, jobToPayload(initial, 'snapshot'))
  return id
}

export async function updateJob(
  id: string,
  progress: ScraperProgress,
  result?: SyncResult,
  novelty?: SyncNoveltySummary,
): Promise<void> {
  const repo = requireRepo()
  const prevEntity = await repo.findById(id)
  const prev = prevEntity ? entityToStoreJob(prevEntity) : undefined
  const stepDetails = trackStep(prev?.stepDetails ?? {}, progress)
  const mergedResult =
    result !== undefined
      ? { ...result, novelty: novelty ?? result.novelty }
      : prev?.result
  const noveltyToPersist = novelty ?? mergedResult?.novelty

  const status = mapPersistedStatus(progress)
  const finishedAt = status === 'success' || status === 'failed' ? new Date() : undefined

  await repo.updateProgress({
    id,
    step: progress.step,
    message: progress.message,
    status,
    stepDetails,
    result: mergedResult,
    novelty: noveltyToPersist,
    error: status === 'failed' ? progress.message : undefined,
    finishedAt,
  })

  const job: SyncJob = {
    portalType: prev?.portalType,
    integrationLinkId: prev?.integrationLinkId ?? prevEntity?.integrationLinkId,
    progress,
    result: mergedResult,
    stepDetails,
  }

  const terminal = status === 'success' || status === 'failed'
  const eventKind: SyncProgressEventKind = terminal
    ? (status === 'success' ? 'completed' : 'failed')
    : 'progress'
  publishSyncJobEvent(id, jobToPayload(job, eventKind))

  if (terminal && prevEntity) {
    const d = prevEntity.toJSON()
    void notifySyncJobTerminal({
      jobId: id,
      integrationLinkId: d.integrationLinkId,
      portalType: d.portalType,
      status,
      trigger: d.trigger,
      novelty: noveltyToPersist,
      message: progress.message,
      finishedAt: (finishedAt ?? new Date()).toISOString(),
    })
  }
}

export async function getJob(id: string): Promise<SyncJob | undefined> {
  const entity = await requireRepo().findById(id)
  if (!entity) return undefined
  return entityToStoreJob(entity)
}

/** @deprecated PG é fonte de verdade — noop para compatibilidade com callers legados. */
export function removeJob(_id: string): void {
  // histórico permanece em sync_jobs
}
