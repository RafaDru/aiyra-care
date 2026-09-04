import type { SupportReportRecord } from '../../domain/support-report/support-report.types.js'

export interface SupportReportDispatchPayload {
  type: 'support_report'
  reportId: string
  category: string
  route: string | null
  consentTechnical: boolean
  consentProfileAccess: boolean
  topFingerprint: string | null
  dashboardUrl: string
  submittedAt: string
}

export function resolveSupportReportWebhookUrl(): string | undefined {
  const dedicated = process.env.SUPPORT_REPORT_WEBHOOK_URL?.trim()
  if (dedicated) return dedicated
  return process.env.OPS_ALERT_WEBHOOK_URL?.trim() || undefined
}

export function resolveSupportReportOpsConsoleUrl(): string {
  const explicit = process.env.OPS_ALERT_DASHBOARD_URL?.trim()
    || process.env.OPS_CONSOLE_PUBLIC_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
  return `http://127.0.0.1:${port}`
}

function extractTopFingerprint(diagnosticContext: Record<string, unknown>): string | null {
  const errors = diagnosticContext.recentClientErrors
  if (!Array.isArray(errors) || !errors.length) return null
  const first = errors[0] as Record<string, unknown> | undefined
  const fp = first?.fingerprint
  return typeof fp === 'string' && fp.length ? fp.slice(0, 32) : null
}

export function buildSupportReportDispatchPayload(
  record: SupportReportRecord,
): SupportReportDispatchPayload {
  return {
    type: 'support_report',
    reportId: record.id,
    category: record.category,
    route: record.route,
    consentTechnical: record.consentTechnical,
    consentProfileAccess: record.consentProfileAccess,
    topFingerprint: record.consentTechnical
      ? extractTopFingerprint(record.diagnosticContext)
      : null,
    dashboardUrl: resolveSupportReportOpsConsoleUrl(),
    submittedAt: record.createdAt.toISOString(),
  }
}

export async function dispatchSupportReport(
  record: SupportReportRecord,
): Promise<boolean> {
  const webhook = resolveSupportReportWebhookUrl()
  if (!webhook) return false
  const payload = buildSupportReportDispatchPayload(record)
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`SUPPORT_REPORT_WEBHOOK failed: HTTP ${res.status}`)
  }
  return true
}
