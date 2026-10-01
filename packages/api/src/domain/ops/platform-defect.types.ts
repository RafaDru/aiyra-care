export type PlatformDefectStatus = 'open' | 'in_fix' | 'ready_for_pr' | 'fixed'

export type PlatformDefectIncidentLinkedBy = 'agent_triage' | 'ops_manual' | 'system_dedup' | string

export interface PlatformDefectRecord {
  id: string
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
  prBatchId: string | null
  firstSeenAt: string
  fixStartedAt: string | null
  readyForPrAt: string | null
  fixedAt: string | null
  createdAt: string
  updatedAt: string
  incidentCount?: number
}

export interface CreatePlatformDefectInput {
  title: string
  fingerprint?: string | null
  impact?: number | null
  applications?: string[]
  ownerSubject?: string | null
  triageSummary?: string | null
  triageArtifactPath?: string | null
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
