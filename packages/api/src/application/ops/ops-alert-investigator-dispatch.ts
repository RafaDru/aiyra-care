import {
  resolveCursorWorkerMachineHint,
  resolveInfraEnvRegularizationAutomationWebhookKey,
  resolveInfraEnvRegularizationAutomationWebhookUrl,
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
  | {
    outcome: 'skipped'
    reason: 'webhook_not_configured' | 'webhook_key_missing' | 'auto_disabled' | 'pre_screen'
  }
  | { outcome: 'failed'; error: string }

export type OpsAlertInvestigatorAgentRole = 'sre_support' | 'infra_env_regularization'

export interface OpsAlertInvestigatorPayload {
  type: 'ops_alert'
  investigationId?: string
  alertId: string
  /** Estável para roteamento na Automation (espelha alertId canônico). */
  alert_kind: string
  /** Worker My Machines — ex. NotebookRafael (`CURSOR_WORKER_NAME`). */
  machineHint: string
  agentRole: OpsAlertInvestigatorAgentRole
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
  analysisQueue?: {
    id: string
    callbackUrl: string
    triageStartedUrl: string
    lane: 'development_support' | 'sre_support' | 'infra_env_regularization'
  }
}

export function usesInfraEnvRegularizationDispatch(alert: OpsAlert): boolean {
  return alert.id === 'infra_api_down'
    && Boolean(resolveInfraEnvRegularizationAutomationWebhookUrl())
}

export function resolveOpsAlertInvestigatorWebhookUrl(alert?: OpsAlert): string | undefined {
  if (alert && usesInfraEnvRegularizationDispatch(alert)) {
    return resolveInfraEnvRegularizationAutomationWebhookUrl()
  }
  return resolveSreSupportAutomationWebhookUrl()
}

export function resolveOpsAlertInvestigatorWebhookKey(alert?: OpsAlert): string | undefined {
  if (alert && usesInfraEnvRegularizationDispatch(alert)) {
    return resolveInfraEnvRegularizationAutomationWebhookKey()
  }
  return resolveSreSupportAutomationWebhookKey()
}

function resolveOpsAlertInvestigatorPlaybook(
  alert: OpsAlert,
  investigationTier: InvestigationTier | undefined,
): string {
  if ((investigationTier ?? 0) === 1) return tier1PlaybookId('sre_support')
  if (usesInfraEnvRegularizationDispatch(alert)) return 'infra-env-regularization'
  return 'ops-alert-tier0'
}

function resolveOpsAlertInvestigatorAgentRole(alert: OpsAlert): OpsAlertInvestigatorAgentRole {
  return usesInfraEnvRegularizationDispatch(alert) ? 'infra_env_regularization' : 'sre_support'
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
    tab: 'incidentes',
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
    alert_kind: alert.id,
    machineHint: resolveCursorWorkerMachineHint(),
    agentRole: resolveOpsAlertInvestigatorAgentRole(alert),
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
      playbook: resolveOpsAlertInvestigatorPlaybook(alert, options.investigationTier),
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
      return 'Webhook Cursor não configurado (SRE ou INFRA_ENV_REGULARIZATION)'
    }
    return 'Webhook key Cursor ausente (SRE ou INFRA_ENV_REGULARIZATION)'
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
    analysisQueue?: { id: string; callbackUrl: string; triageStartedUrl: string }
    investigationTier?: InvestigationTier
  },
): Promise<OpsAlertInvestigatorDispatchResult> {
  if (options.trigger === 'auto' && !isOpsAlertInvestigatorAutoEnabled()) {
    return { outcome: 'skipped', reason: 'auto_disabled' }
  }
  const webhook = resolveOpsAlertInvestigatorWebhookUrl(alert)
  if (!webhook) return { outcome: 'skipped', reason: 'webhook_not_configured' }
  const bearerKey = resolveOpsAlertInvestigatorWebhookKey(alert)
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
            triageStartedUrl: options.analysisQueue.triageStartedUrl,
            lane: usesInfraEnvRegularizationDispatch(alert)
              ? ('infra_env_regularization' as const)
              : ('sre_support' as const),
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
