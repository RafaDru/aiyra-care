import type { SyncablePortalType } from './sync-portal-profile.js'

export interface SyncStepDetail {
  status: 'running' | 'success' | 'failed'
  message: string
}

export interface SyncJobProgressResult {
  exams: number
  medicalRecords: number
  authorizations: number
  authorizationItems: number
  updatedAuthorizations: number
  total: number
  warnings?: string[]
  novelty?: Record<string, number | undefined>
  beneficiaryDetails?: unknown[]
  unmatchedBeneficiaries?: unknown[]
  authorizationDetails?: unknown[]
}

export type SyncJobOverallStatus = 'running' | 'success' | 'partial' | 'failed'

export interface SyncJobProgressState {
  portalType: SyncablePortalType
  step: string
  message: string
  status: SyncJobOverallStatus
  currentStep: number
  stepDetails: Record<string, SyncStepDetail>
  result: SyncJobProgressResult | null
  longRunning: boolean
}

export const SYNC_POLL_MS = 800
export const SYNC_LONG_RUNNING_HINT_MS = 3 * 60 * 1000
/** Sem evento de stream (progress ou heartbeat) — dispara reconciliação via GET. */
export const SYNC_STREAM_STALE_MS = 45_000
/** Intervalo para checar staleness (não é poll contínuo de progresso). */
export const SYNC_FALLBACK_CHECK_MS = 15_000

export function isSyncJobFinished(p: { step: string; status: string; result?: SyncJobProgressResult }) {
  if (p.result !== undefined) return true
  return p.step === 'done' && (p.status === 'success' || p.status === 'failed')
}

export function isFatalSyncJobFailure(step: string, status: string): boolean {
  return status === 'failed' && step === 'error'
}
