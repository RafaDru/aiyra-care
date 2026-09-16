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

export interface OpsAnalysisQueueRecord {
  id: string
  sourceType: AnalysisQueueSourceType
  sourceId: string
  lane: AnalysisQueueLane
  status: AnalysisQueueStatus
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
}
