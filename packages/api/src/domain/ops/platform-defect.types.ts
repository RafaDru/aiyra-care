import type {
  CorrectionFailureDetails,
  PlatformDefectFailureKind,
} from './platform-defect-correction-failure.js'

export type PlatformDefectStatus = 'open' | 'in_fix' | 'ready_for_pr' | 'fixed'

/** Callback semantic — not a PG `status` value. */
export type PlatformDefectAgentCallbackStatus = PlatformDefectStatus | 'correction_failed'

export type PlatformDefectFixedVia = 'github_webhook' | 'manual'

export type PlatformDefectIncidentLinkedBy = 'agent_triage' | 'ops_manual' | 'system_dedup' | string

export interface PlatformDefectRecord {
  id: string
  referenceCode: string | null
  title: string
  status: PlatformDefectStatus
  fingerprint: string | null
  impact: number | null
  applications: string[]
  ownerSubject: string | null
  triageSummary: string | null
  triageArtifactPath: string | null
  branchName: string | null
  prUrl: string | null
  mergedPrUrl: string | null
  mergedAt: string | null
  fixedVia: PlatformDefectFixedVia | null
  prBatchId: string | null
  firstSeenAt: string
  fixStartedAt: string | null
  lastFixDispatchSentAt: string | null
  readyForPrAt: string | null
  fixedAt: string | null
  lastFailureKind: PlatformDefectFailureKind | null
  lastFailureSummary: string | null
  lastCorrectionFailureDetails: CorrectionFailureDetails | null
  correctionFailedAt: string | null
  createdAt: string
  updatedAt: string
  incidentCount?: number
  parentDefectId?: string | null
  parentReferenceCode?: string | null
}

export interface CreatePlatformDefectInput {
  title: string
  fingerprint?: string | null
  impact?: number | null
  applications?: string[]
  ownerSubject?: string | null
  triageSummary?: string | null
  triageArtifactPath?: string | null
  parentDefectId?: string | null
}

export interface CreatePlatformDefectFromTriageContext {
  incidentSeenAt: string
  parentDefectId?: string | null
  /** Hint do Triador quando fingerprint instável — exige `parentDefectId` explícito. */
  recurrenceLikely?: boolean
}

export type DefectPrBatchStatus = 'open' | 'merged' | 'failed'

export interface DefectPrBatchRecord {
  id: string
  status: DefectPrBatchStatus
  scheduledWindowStart: string
  mergedPrUrl: string | null
  defectCount: number
  createdAt: string
}
