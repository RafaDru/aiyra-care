export type AnalysisQueueSourceType = 'support_report' | 'ops_alert'
export type AnalysisQueueLane = 'development_support' | 'sre_support'
export type AnalysisQueueStatus =
  | 'queued'
  | 'investigating'
  | 'fix_proposed'
  | 'completed'
  | 'dismissed'
  | 'failed'
export type AnalysisQueuePriority = 'low' | 'normal' | 'high' | 'critical'

export type IncidentPipelineStatus =
  | 'open'
  | 'forwarded'
  | 'queued_worker'
  | 'in_triage'
  | 'triaged'
  | 'dismissed'
  | 'dispatch_failed'

export interface OpsAnalysisQueueRecord {
  id: string
  sourceType: AnalysisQueueSourceType
  sourceId: string
  lane: AnalysisQueueLane
  status: AnalysisQueueStatus
  incidentPipelineStatus: IncidentPipelineStatus
  priority: AnalysisQueuePriority
  deploymentTier: string
  title: string
  errorSummary: string | null
  contextSnapshot: Record<string, unknown>
  remediationSummary: string | null
  analysisArtifactPath: string | null
  prUrl: string | null
  analysisLastError: string | null
  operatorNotes: string | null
  investigationTrigger: 'auto' | 'manual' | null
  queuedAt: string
  investigationRequestedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OpsAnalysisAttentionCounts {
  queued: number
  investigating: number
  fixProposed: number
  failed: number
  totalAttention: number
}

export interface SupportReportAgentPatch {
  reportId: string
  suggestedCategory?: string
  categoryReviewNote?: string
  taxonomyGapProposal?: string
  deploymentStatus?: string
  deploymentActions?: Array<{ label: string; kind: string; url?: string; done?: boolean }>
  analysisSummary?: string
  analysisArtifactPath?: string
}

export interface AgentAnalysisCallbackInput {
  /** Chave canônica — `ops_analysis_queue.id` */
  investigationId?: string
  /** @deprecated use investigationId */
  queueId?: string
  sourceType?: AnalysisQueueSourceType
  sourceId?: string
  remediationSummary: string
  analysisArtifactPath?: string
  prUrl?: string
  errorSummary?: string
  deploymentStatus?: string
  deploymentActions?: Array<{ label: string; kind: string; url?: string; done?: boolean }>
  /** Atualizações por ticket (batch ou multi-report) */
  reportPatches?: SupportReportAgentPatch[]
  triageDecision?: 'new_defect' | 'link_defect' | 'infra_failure' | 'dismiss' | 'resolve_incident_only'
  defect?: {
    title: string
    fingerprint?: string
    impact?: number
    applications?: string[]
  }
  linkDefectId?: string
  /** Atualização agente 2 no mesmo endpoint */
  defectId?: string
  defectStatus?: 'ready_for_pr' | 'fixed'
  branchName?: string
}
