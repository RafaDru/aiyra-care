export type PlatformDefectFailureKind =
  | 'dispatch'
  | 'callback'
  | 'ci'
  | 'review'
  | 'human_reject'

/** Payload `failureDetails` on `defectStatus: correction_failed` callback. */
export interface CorrectionFailureDetails {
  message: string
  code?: string
  logUrl?: string
  runUrl?: string
  artifactPath?: string
  blockedReason?: string
}

export function parseCorrectionFailureDetails(input: unknown): CorrectionFailureDetails | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const message = raw.message
  if (typeof message !== 'string' || !message.trim()) return null
  const details: CorrectionFailureDetails = { message: message.trim() }
  if (typeof raw.code === 'string' && raw.code.trim()) details.code = raw.code.trim()
  if (typeof raw.logUrl === 'string' && raw.logUrl.trim()) details.logUrl = raw.logUrl.trim()
  if (typeof raw.runUrl === 'string' && raw.runUrl.trim()) details.runUrl = raw.runUrl.trim()
  if (typeof raw.artifactPath === 'string' && raw.artifactPath.trim()) {
    details.artifactPath = raw.artifactPath.trim()
  }
  if (typeof raw.blockedReason === 'string' && raw.blockedReason.trim()) {
    details.blockedReason = raw.blockedReason.trim()
  }
  return details
}

export function summarizeCorrectionFailure(details: CorrectionFailureDetails): string {
  const parts = [details.message]
  if (details.code) parts.unshift(`[${details.code}]`)
  return parts.join(' ').slice(0, 2000)
}
