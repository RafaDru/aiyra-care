export const SUPPORT_REPORT_CATEGORIES = [
  'technical_bug',
  'incorrect_data',
  'ux_confusion',
  'other',
] as const

export type SupportReportCategory = typeof SUPPORT_REPORT_CATEGORIES[number]

export const SUPPORT_REPORT_STATUSES = ['open', 'triaged', 'resolved', 'closed'] as const

export type SupportReportStatus = typeof SUPPORT_REPORT_STATUSES[number]

export const SUPPORT_REPORT_CATEGORY_SET = new Set<string>(SUPPORT_REPORT_CATEGORIES)

export const PROFILE_ACCESS_DAYS = 7
export const REPORT_RETENTION_DAYS = 30
export const MAX_DESCRIPTION_LENGTH = 2000
export const MAX_SCREENSHOT_BASE64_LENGTH = 600_000

export interface CreateSupportReportInput {
  category: SupportReportCategory
  description?: string
  route?: string
  sessionId?: string
  patientId?: string
  consentTechnical: boolean
  consentScreenshot: boolean
  consentProfileAccess: boolean
  screenshotData?: string
  appVersion?: string
  userAgent?: string
  clientContext?: Record<string, unknown>
}

export interface SupportReportRecord {
  id: string
  accountId: string
  status: SupportReportStatus
  category: SupportReportCategory
  description: string | null
  route: string | null
  sessionId: string | null
  patientId: string | null
  consentTechnical: boolean
  consentScreenshot: boolean
  consentProfileAccess: boolean
  profileAccessUntil: Date | null
  diagnosticContext: Record<string, unknown>
  hasScreenshot: boolean
  appVersion: string | null
  userAgent: string | null
  expiresAt: Date
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function sanitizeSupportDescription(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().slice(0, MAX_DESCRIPTION_LENGTH)
  return trimmed.length ? trimmed : null
}

export function sanitizeSupportClientContext(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!value) return {}
  const out: Record<string, unknown> = {}
  const allowed = new Set(['viewport', 'locale', 'theme', 'active_tab', 'referrer_route'])
  for (const [key, val] of Object.entries(value)) {
    if (!allowed.has(key)) continue
    if (typeof val === 'string' && val.length <= 128) out[key] = val
    if (typeof val === 'number' && Number.isFinite(val)) out[key] = val
    if (typeof val === 'boolean') out[key] = val
  }
  return out
}
