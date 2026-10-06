export type DefectPrReviewStatus = 'pending' | 'running' | 'completed' | 'failed'

export type DefectPrReviewTrigger = 'manual' | 'auto_ready' | 'batch'

export type DefectPrReviewRecommendation = 'approve' | 'request_changes' | 'block'

export type DefectPrReviewEffectivenessVerdict = 'plausible' | 'uncertain' | 'unlikely'

export type DefectPrReviewRiskLevel = 'nulo' | 'baixo' | 'medio' | 'alto' | 'grave'

export type DefectPrReviewSecurityVerdict = 'pass' | 'concerns' | 'block'

export interface DefectPrReviewDimensions {
  correctionEffectiveness?: {
    verdict: DefectPrReviewEffectivenessVerdict
    summary: string
    evidence?: string[]
  }
  risk?: {
    level: DefectPrReviewRiskLevel
    summary: string
  }
  security?: {
    verdict: DefectPrReviewSecurityVerdict
    summary: string
    findings?: string[]
  }
}

export interface DefectPrReviewRecord {
  id: string
  defectId: string
  status: DefectPrReviewStatus
  trigger: DefectPrReviewTrigger
  prUrl: string
  branchName: string | null
  headSha: string | null
  investigationId: string | null
  dimensions: DefectPrReviewDimensions | null
  recommendation: DefectPrReviewRecommendation | null
  recommendationRationale: string | null
  ciSnapshot: Record<string, unknown> | null
  prReviewCommentUrl: string | null
  agentRunUrl: string | null
  failureDetails: Record<string, unknown> | null
  rawJson: Record<string, unknown> | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

/** Resumo para listagem CH (GET defeitos / detalhe). */
export interface DefectPrReviewSummary {
  id: string
  status: DefectPrReviewStatus
  recommendation: DefectPrReviewRecommendation | null
  correctionEffectiveness: DefectPrReviewEffectivenessVerdict | null
  riskLevel: DefectPrReviewRiskLevel | null
  riskSummary: string | null
  securityVerdict: DefectPrReviewSecurityVerdict | null
  securitySummary: string | null
  recommendationRationale: string | null
  completedAt: string | null
  prReviewCommentUrl: string | null
  agentRunUrl: string | null
  /** Rótulo PT no momento da revisão — ex. «CI: verde». */
  ciStatusLabel: string | null
  ciStatusKind: 'green' | 'failed' | 'pending' | null
}

export interface DefectPrReviewCallbackInput {
  kind?: string
  defectId: string
  reviewId?: string
  investigationId?: string
  status: 'completed' | 'failed'
  dimensions?: DefectPrReviewDimensions
  recommendation?: DefectPrReviewRecommendation
  recommendationRationale?: string
  ciSnapshot?: Record<string, unknown>
  prReviewCommentUrl?: string
  agentRunUrl?: string
  failureDetails?: Record<string, unknown>
  headSha?: string
}
