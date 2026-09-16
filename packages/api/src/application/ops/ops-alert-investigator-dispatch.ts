import {
  resolveSreSupportAutomationWebhookKey,
  resolveSreSupportAutomationWebhookUrl,
} from '../../domain/ops/cursor-automation-env.js'
import {
  tier1PlaybookId,
  type InvestigationTier,
} from '../../domain/ops/investigator-tier.js'
import {
  buildOpsConsoleUrl,
  formatInvestigationIdShort,
} from '../../domain/ops/investigation-correlation.js'
import type { InvestigatorEnvironmentContext } from '../../domain/ops/investigator-environment.js'
import { resolveInvestigatorEnvironmentContext } from '../../domain/ops/investigator-environment.js'
import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type { OpsAlertTriageRow } from '../../domain/ops/ops-alert-triage.js'
import { resolveOpsAlertDashboardUrl } from './ops-alert-dispatch.service.js'

export type OpsAlertInvestigatorDispatchResult =
  | { outcome: 'sent' }
  | { outcome: 'skipped'; reason: 'webhook_not_configured' | 'webhook_key_missing' | 'auto_disabled' | 'pre_screen' }
  | { outcome: 'failed'; error: string }

export interface OpsAlertInvestigatorPayload {
  type: 'ops_alert'
  investigationId?: string
  alertId: string
  severity: OpsAlert['severity']
  category: OpsAlert['category']
  message: string
  details?: Record<string, unknown>
  triage?: OpsAlertTriageRow
  dashboardUrl: string
  environment: InvestigatorEnvironmentContext
  checkedAt: string
  text: string
  operatorNotes?: string | null
  investigation?: { tier: 0 | 1; playbook: string; trigger: 'auto' | 'manual' }
  analysisQueue?: { id: string; callbackUrl: string; lane: 'development_support' | 'sre_support' }
}

export function resolveOpsAlertInvestigatorWebhookUrl(): string | undefined {
  return resolveSreSupportAutomationWebhookUrl()
}

export function resolveOpsAlertInvestigatorWebhookKey(): string | undefined {
  return resolveSreSupportAutomationWebhookKey()
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
    investigationTier?: InvestigationTier
    investigationId?: string
  },
): OpsAlertInvestigatorPayload {
  const consoleBase = resolveOpsAlertDashboardUrl()?.replace(/\?.*$/, '')
    ?? `http://127.0.0.1:${process.env.OPS_CONSOLE_PORT ?? '3013'}`
  const dashboardUrl = buildOpsConsoleUrl(consoleBase, {
    tab: 'issues',
    investigationId: options.investigationId,
    alertId: alert.id,
  })
  const label = `[${alert.severity}] ${alert.category}: ${alert.message}`
  const invSuffix = options.investigationId
    ? ` [inv:${formatInvestigationIdShort(options.investigationId)}]`
    : ''
  return {
    type: 'ops_alert',
    ...(options.investigationId ? { investigationId: options.investigationId } : {}),
    alertId: alert.id,
    severity: alert.severity,
    category: alert.category,
    message: alert.message,
    ...(alert.details ? { details: alert.details } : {}),
    ...(options.triage ? { triage: options.triage } : {}),
    dashboardUrl,
    environment: resolveInvestigatorEnvironmentContext(),
    checkedAt: options.checkedAt,
    text: `Alerta ops: ${label}${invSuffix}`,
    ...(options.operatorNotes ? { operatorNotes: options.operatorNotes.slice(0, 2000) } : {}),
    investigation: {
      tier: options.investigationTier ?? 0,
      playbook: (options.investigationTier ?? 0) === 1
        ? tier1PlaybookId('sre_support')
        : 'ops-alert-tier0',
      trigger: options.trigger,
    },
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
      return 'CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL não configurado'
    }
    return 'CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY não configurado'
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
    analysisQueue?: { id: string; callbackUrl: string }
    investigationTier?: InvestigationTier
  },
): Promise<OpsAlertInvestigatorDispatchResult> {
  if (options.trigger === 'auto' && !isOpsAlertInvestigatorAutoEnabled()) {
    return { outcome: 'skipped', reason: 'auto_disabled' }
  }
  const webhook = resolveOpsAlertInvestigatorWebhookUrl()
  if (!webhook) return { outcome: 'skipped', reason: 'webhook_not_configured' }
  const bearerKey = resolveOpsAlertInvestigatorWebhookKey()
  if (!bearerKey) return { outcome: 'skipped', reason: 'webhook_key_missing' }

  const investigationId = options.analysisQueue?.id
  const payload = {
    ...buildOpsAlertInvestigatorPayload(alert, {
      checkedAt: options.checkedAt,
      triage: options.triage,
      operatorNotes: options.operatorNotes,
      trigger: options.trigger,
      investigationTier: options.investigationTier,
      investigationId,
    }),
    ...(options.analysisQueue
      ? {
          investigationId: options.analysisQueue.id,
          analysisQueue: {
            id: options.analysisQueue.id,
            callbackUrl: options.analysisQueue.callbackUrl,
            lane: 'sre_support' as const,
          },
        }
      : {}),
  }
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
