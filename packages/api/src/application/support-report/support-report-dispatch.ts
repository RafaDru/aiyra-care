import type { SupportReportRecord } from '../../domain/support-report/support-report.types.js'

const CATEGORY_LABEL: Record<string, string> = {
  technical_bug: 'Bug técnico',
  incorrect_data: 'Dado incorreto',
  ux_confusion: 'Confusão de UX',
  other: 'Outro',
}

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
  text: string
  toast: { title: string; body: string; icon: 'info' | 'warning' }
  investigation?: { tier: 0 | 1; playbook: string }
}

export function resolveSupportInvestigatorWebhookUrl(): string | undefined {
  return process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL?.trim() || undefined
}

export function resolveSupportInvestigatorWebhookKey(): string | undefined {
  let raw = process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY?.trim()
  if (!raw) return undefined
  raw = raw.replace(/^["']|["']$/g, '')
  raw = raw.replace(/^Authorization:\s*/i, '')
  raw = raw.replace(/^Bearer\s+/i, '')
  return raw.length ? raw : undefined
}

export function resolveSupportReportWebhookUrl(): string | undefined {
  const dedicated = process.env.SUPPORT_REPORT_WEBHOOK_URL?.trim()
  if (dedicated) return dedicated
  return process.env.OPS_ALERT_WEBHOOK_URL?.trim() || undefined
}

export function resolveSupportReportOpsConsoleUrl(): string {
  const explicit = process.env.OPS_ALERT_DASHBOARD_URL?.trim()
    || process.env.OPS_CONSOLE_PUBLIC_URL?.trim()
  let base: string
  if (explicit) {
    let url = explicit.replace(/\/$/, '')
    if (/:5173\/ops$/.test(url)) {
      const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
      const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
      url = `http://${host}:${port}`
    }
    base = url
  } else {
    const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
    base = `http://127.0.0.1:${port}`
  }
  return `${base}?tab=support`
}

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category
}

function buildToastBody(
  category: string,
  route: string | null,
  topFingerprint: string | null,
): string {
  const lines = [categoryLabel(category)]
  if (route) lines.push(route)
  if (topFingerprint) lines.push(`Erro: ${topFingerprint}`)
  lines.push('Console → aba Suporte')
  return lines.join('\n')
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
  const topFingerprint = record.consentTechnical
    ? extractTopFingerprint(record.diagnosticContext)
    : null
  const dashboardUrl = resolveSupportReportOpsConsoleUrl()
  const toastBody = buildToastBody(record.category, record.route, topFingerprint)
  const label = categoryLabel(record.category)
  const routeSuffix = record.route ? ` — ${record.route}` : ''

  return {
    type: 'support_report',
    reportId: record.id,
    category: record.category,
    route: record.route,
    consentTechnical: record.consentTechnical,
    consentProfileAccess: record.consentProfileAccess,
    topFingerprint,
    dashboardUrl,
    submittedAt: record.createdAt.toISOString(),
    text: `Novo chamado: ${label}${routeSuffix}`,
    toast: {
      title: 'AiyraCare | Novo chamado',
      body: toastBody,
      icon: 'info',
    },
  }
}

export async function postSupportReportWebhook(
  url: string,
  payload: SupportReportDispatchPayload,
  options?: { bearerKey?: string },
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options?.bearerKey) {
    headers.Authorization = `Bearer ${options.bearerKey}`
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`support_report webhook failed (${url}): HTTP ${res.status}`)
  }
}

export async function dispatchSupportReport(
  record: SupportReportRecord,
): Promise<boolean> {
  const webhook = resolveSupportReportWebhookUrl()
  if (!webhook) return false
  const payload = buildSupportReportDispatchPayload(record)
  await postSupportReportWebhook(webhook, payload)
  return true
}

export async function dispatchSupportReportInvestigator(
  record: SupportReportRecord,
): Promise<boolean> {
  const webhook = resolveSupportInvestigatorWebhookUrl()
  if (!webhook) return false
  const bearerKey = resolveSupportInvestigatorWebhookKey()
  if (!bearerKey) {
    throw new Error('CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY required for Cursor Automation webhook')
  }
  const payload: SupportReportDispatchPayload = {
    ...buildSupportReportDispatchPayload(record),
    investigation: { tier: 0, playbook: 'support-report-tier0' },
  }
  await postSupportReportWebhook(webhook, payload, { bearerKey })
  return true
}

export async function dispatchSupportReportNotifications(
  record: SupportReportRecord,
): Promise<{ notifier: boolean; investigator: boolean }> {
  const [notifier, investigator] = await Promise.allSettled([
    dispatchSupportReport(record),
    dispatchSupportReportInvestigator(record),
  ])
  return {
    notifier: notifier.status === 'fulfilled' && notifier.value,
    investigator: investigator.status === 'fulfilled' && investigator.value,
  }
}
