export const OPS_ALERT_ANALYSIS_STATUSES = [
  'none',
  'pending',
  'in_progress',
  'completed',
  'failed',
] as const

export type OpsAlertAnalysisStatus = typeof OPS_ALERT_ANALYSIS_STATUSES[number]

export const MAX_OPS_ALERT_OPERATOR_NOTES_LENGTH = 2000
export const MAX_OPS_ALERT_ANALYSIS_SUMMARY_LENGTH = 4000

export interface OpsAlertAnalysisRecord {
  alertId: string
  analysisStatus: OpsAlertAnalysisStatus
  operatorNotes: string | null
  analysisSummary: string | null
  analysisArtifactPath: string | null
  analysisRequestedAt: string | null
  analysisCompletedAt: string | null
  analysisLastError: string | null
  lastSeverity: string | null
  lastCategory: string | null
  lastMessage: string | null
}

export function sanitizeOpsAlertOperatorNotes(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().slice(0, MAX_OPS_ALERT_OPERATOR_NOTES_LENGTH)
  return trimmed.length ? trimmed : null
}

export function sanitizeOpsAlertAnalysisSummary(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().slice(0, MAX_OPS_ALERT_ANALYSIS_SUMMARY_LENGTH)
  return trimmed.length ? trimmed : null
}

export function emptyOpsAlertAnalysis(alertId: string): OpsAlertAnalysisRecord {
  return {
    alertId,
    analysisStatus: 'none',
    operatorNotes: null,
    analysisSummary: null,
    analysisArtifactPath: null,
    analysisRequestedAt: null,
    analysisCompletedAt: null,
    analysisLastError: null,
    lastSeverity: null,
    lastCategory: null,
    lastMessage: null,
  }
}
