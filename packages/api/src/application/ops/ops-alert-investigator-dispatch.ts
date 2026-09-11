import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type { OpsAlertTriageRow } from '../../domain/ops/ops-alert-triage.js'
import { resolveOpsAlertDashboardUrl } from './ops-alert-dispatch.service.js'
import {
  resolveSupportInvestigatorWebhookKey,
  resolveSupportInvestigatorWebhookUrl,
} from '../support-report/support-report-dispatch.js'

export type OpsAlertInvestigatorDispatchResult =
  | { outcome: 'sent' }
  | { outcome: 'skipped'; reason: 'webhook_not_configured' | 'webhook_key_missing' | 'auto_disabled' }
  | { outcome: 'failed'; error: string }

export interface OpsAlertInvestigatorPayload {
  type: 'ops_alert'
  alertId: string
  severity: OpsAlert['severity']
  category: OpsAlert['category']
  message: string
  details?: Record<string, unknown>
  triage?: OpsAlertTriageRow
  dashboardUrl: string
  checkedAt: string
  text: string
  operatorNotes?: string | null
  investigation?: { tier: 0 | 1; playbook: string; trigger: 'auto' | 'manual' }
}

export function resolveOpsAlertInvestigatorWebhookUrl(): string | undefined {
  const dedicated = process.env.CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_URL?.trim()
  if (dedicated) return dedicated
  return resolveSupportInvestigatorWebhookUrl()
}

export function resolveOpsAlertInvestigatorWebhookKey(): string | undefined {
  const dedicated = process.env.CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_KEY?.trim()
  if (dedicated) {
    let raw = dedicated.replace(/^["']|["']$/g, '')
    raw = raw.replace(/^Authorization:\s*/i, '')
    raw = raw.replace(/^Bearer\s+/i, '')
    return raw.length ? raw : undefined
  }
  return resolveSupportInvestigatorWebhookKey()
}

export function isOpsAlertInvestigatorAutoEnabled(): boolean {
  const raw = process.env.OPS_ALERT_INVESTIGATOR_AUTO?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  return true
}

export function shouldAutoInvestigateOpsAlert(
  alert: OpsAlert,
  triage?: OpsAlertTriageRow,
): boolean {
  if (!isOpsAlertInvestigatorAutoEnabled()) return false
  if (alert.category !== 'infra') return false
  if (alert.severity !== 'critical') return false
  if (triage && !triage.humanRequired) return false
  return true
}

export function buildOpsAlertInvestigatorPayload(
  alert: OpsAlert,
  options: {
    checkedAt: string
    triage?: OpsAlertTriageRow
    operatorNotes?: string | null
    trigger: 'auto' | 'manual'
  },
): OpsAlertInvestigatorPayload {
  const dashboardUrl = resolveOpsAlertDashboardUrl() ?? `http://127.0.0.1:${process.env.OPS_CONSOLE_PORT ?? '3013'}`
  const label = `[${alert.severity}] ${alert.category}: ${alert.message}`
  return {
    type: 'ops_alert',
    alertId: alert.id,
    severity: alert.severity,
    category: alert.category,
    message: alert.message,
    ...(alert.details ? { details: alert.details } : {}),
    ...(options.triage ? { triage: options.triage } : {}),
    dashboardUrl,
    checkedAt: options.checkedAt,
    text: `Alerta ops: ${label}`,
    ...(options.operatorNotes ? { operatorNotes: options.operatorNotes.slice(0, 2000) } : {}),
    investigation: { tier: 0, playbook: 'ops-alert-tier0', trigger: options.trigger },
  }
}

export function analysisStatusFromOpsInvestigatorResult(
  result: OpsAlertInvestigatorDispatchResult,
): 'none' | 'pending' | 'in_progress' | 'failed' {
  if (result.outcome === 'sent') return 'in_progress'
  if (result.outcome === 'skipped' && result.reason === 'auto_disabled') return 'none'
  if (result.outcome === 'skipped') return 'none'
  return 'failed'
}

export function analysisErrorFromOpsInvestigatorResult(
  result: OpsAlertInvestigatorDispatchResult,
): string | null {
  if (result.outcome === 'failed') return result.error
  if (result.outcome === 'skipped') {
    if (result.reason === 'auto_disabled') return null
    if (result.reason === 'webhook_not_configured') {
      return 'CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_URL / CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL não configurado'
    }
    return 'CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_KEY / CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY não configurado'
  }
  return null
}

export async function dispatchOpsAlertInvestigator(
  alert: OpsAlert,
  options: {
    checkedAt: string
    triage?: OpsAlertTriageRow
    operatorNotes?: string | null
    trigger: 'auto' | 'manual'
  },
): Promise<OpsAlertInvestigatorDispatchResult> {
  if (options.trigger === 'auto' && !isOpsAlertInvestigatorAutoEnabled()) {
    return { outcome: 'skipped', reason: 'auto_disabled' }
  }
  const webhook = resolveOpsAlertInvestigatorWebhookUrl()
  if (!webhook) return { outcome: 'skipped', reason: 'webhook_not_configured' }
  const bearerKey = resolveOpsAlertInvestigatorWebhookKey()
  if (!bearerKey) return { outcome: 'skipped', reason: 'webhook_key_missing' }

  const payload = buildOpsAlertInvestigatorPayload(alert, options)
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerKey}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      return { outcome: 'failed', error: `ops_alert investigator webhook failed: HTTP ${res.status}` }
    }
    return { outcome: 'sent' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ops_alert_investigator_dispatch_failed'
    return { outcome: 'failed', error: message }
  }
}
