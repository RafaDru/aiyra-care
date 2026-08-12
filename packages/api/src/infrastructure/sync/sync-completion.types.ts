import type { SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'
import type { SyncJobTrigger } from '../../domain/sync-job/sync-job.entity.js'

export type SyncCompletionStatus = 'success' | 'failed'

export interface SyncCompletionEvent {
  jobId: string
  integrationLinkId: string
  patientId: string
  portalType: string
  status: SyncCompletionStatus
  trigger: SyncJobTrigger
  message?: string
  novelty?: SyncNoveltySummary
  finishedAt: string
}
