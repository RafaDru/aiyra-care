import type { OpsAlert } from './ops-metrics.types.js'

/** Camada de classificação para dispatch filtrado (sem PHI). */
export type OpsAlertTier = 'infra' | 'app_sync' | 'llm' | 'product'

export interface OpsAlertTriageRow {
  alertId: string
  severity: OpsAlert['severity']
  category: OpsAlert['category']
  tier: OpsAlertTier
  humanRequired: boolean
  reason: string
}

const AUTO_HANDLE_WARNING_IDS = new Set([
  'llm_quota_spike',
  'internal_llm_budget_exhausted',
  'infra_api_slow',
  'infra_postgres_slow',
  'infra_neo4j_down',
])

function mapTier(alert: OpsAlert): OpsAlertTier {
  if (alert.category === 'infra') return 'infra'
  if (alert.category === 'sync') return 'app_sync'
  if (alert.category === 'llm') return 'llm'
  return 'product'
}

function isHumanRequired(alert: OpsAlert): boolean {
  if (alert.severity === 'critical') return true
  if (AUTO_HANDLE_WARNING_IDS.has(alert.id)) return false
  if (alert.id.startsWith('sync_fail_rate_') && alert.severity === 'warning') return false
  return false
}

function triageReason(alert: OpsAlert, humanRequired: boolean): string {
  if (humanRequired) {
    if (alert.severity === 'critical') return 'critical — requer operador'
    return 'warning escalada — requer operador'
  }
  if (AUTO_HANDLE_WARNING_IDS.has(alert.id)) return 'warning conhecida — modo degradado / produto'
  if (alert.id.startsWith('sync_fail_rate_')) return 'fail rate moderado — monitorar no console'
  return 'informativo — sem pager'
}

export function triageOpsAlert(alert: OpsAlert): OpsAlertTriageRow {
  const tier = mapTier(alert)
  const humanRequired = isHumanRequired(alert)
  return {
    alertId: alert.id,
    severity: alert.severity,
    category: alert.category,
    tier,
    humanRequired,
    reason: triageReason(alert, humanRequired),
  }
}

export function triageOpsAlerts(alerts: OpsAlert[]): OpsAlertTriageRow[] {
  return alerts.map(triageOpsAlert)
}

export function filterAlertsForDispatch(
  alerts: OpsAlert[],
  mode: 'all' | 'human_required',
): OpsAlert[] {
  if (mode === 'all') return alerts
  const triage = triageOpsAlerts(alerts)
  const humanIds = new Set(triage.filter((t) => t.humanRequired).map((t) => t.alertId))
  return alerts.filter((a) => humanIds.has(a.id))
}

export function resolveOpsAlertDispatchMode(): 'all' | 'human_required' {
  const raw = process.env.OPS_ALERTS_DISPATCH_MODE?.trim().toLowerCase()
  if (raw === 'all') return 'all'
  return 'human_required'
}
