import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import { allKnownSyncStepKeys, type SyncablePortalType } from '../../domain/scraper/sync-portal-profile.js'
import type { SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'
import { SyncJob as SyncJobEntity } from '../../domain/sync-job/sync-job.entity.js'
import type { SyncJobPgRepository } from '../persistence/sync-job.pg.repository.js'

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

const TRACKED_STEPS = new Set(allKnownSyncStepKeys())

function trackStep(
  stepDetails: Record<string, SyncStepDetail>,
  progress: ScraperProgress,
): Record<string, SyncStepDetail> {
  if (!TRACKED_STEPS.has(progress.step) && !progress.step.startsWith('fetch-')) {
    return stepDetails
  }
  return {
    ...stepDetails,
    [progress.step]: {
      status: progress.status === 'failed' ? 'failed' : progress.status === 'success' ? 'success' : 'running',
      message: progress.message,
    },
  }
}

const jobs = new Map<string, SyncJob>()
let syncJobRepo: SyncJobPgRepository | null = null

export function bindSyncJobPersistence(repo: SyncJobPgRepository): void {
  syncJobRepo = repo
}

function mapPersistedStatus(progress: ScraperProgress): 'pending' | 'running' | 'success' | 'failed' {
  if (progress.step === 'error' || progress.status === 'failed') return 'failed'
  if (progress.step === 'done' && progress.status === 'success') return 'success'
  if (progress.step === 'pending') return 'pending'
  return 'running'
}

function persistJobUpdate(
  id: string,
  progress: ScraperProgress,
  stepDetails: Record<string, SyncStepDetail>,
  result?: SyncResult,
  novelty?: SyncNoveltySummary,
): void {
  if (!syncJobRepo) return
  const status = mapPersistedStatus(progress)
  const finishedAt = status === 'success' || status === 'failed' ? new Date() : undefined
  syncJobRepo.updateProgress({
    id,
    step: progress.step,
    message: progress.message,
    status,
    stepDetails,
    result,
    novelty,
    error: status === 'failed' ? progress.message : undefined,
    finishedAt,
  }).catch(() => {})
}

export function createJob(portalType?: SyncablePortalType, integrationLinkId?: string): string {
  const id = crypto.randomUUID()
  jobs.set(id, {
    portalType,
    integrationLinkId,
    progress: { step: 'pending', message: 'Aguardando...', status: 'running' },
    stepDetails: {},
  })
  if (syncJobRepo && integrationLinkId) {
    const entity = SyncJobEntity.create({
      id,
      integrationLinkId,
      portalType: portalType ?? 'unknown',
      trigger: 'manual',
    })
    syncJobRepo.save(entity).catch(() => {})
  }
  return id
}

export function updateJob(
  id: string,
  progress: ScraperProgress,
  result?: SyncResult,
  novelty?: SyncNoveltySummary,
) {
  const prev = jobs.get(id)
  const stepDetails = trackStep(prev?.stepDetails ?? {}, progress)
  const mergedResult = result !== undefined ? result : prev?.result
  jobs.set(id, {
    portalType: prev?.portalType,
    progress,
    result: mergedResult,
    stepDetails,
  })
  persistJobUpdate(id, progress, stepDetails, mergedResult, novelty)
}

export function getJob(id: string): SyncJob | undefined {
  return jobs.get(id)
}

export function removeJob(id: string) {
  jobs.delete(id)
}
