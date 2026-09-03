import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type { OpsMetricsService } from './ops-metrics.service.js'
import {
  filterAlertsForDispatch,
  resolveOpsAlertDispatchMode,
  triageOpsAlerts,
  type OpsAlertTriageRow,
} from '../../domain/ops/ops-alert-triage.js'
import {
  buildOpsAlertToast,
  sanitizeOpsToastText,
  type OpsAlertToast,
} from '../../domain/ops/ops-alert-toast.js'

const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000

function minSeverity(): 'warning' | 'critical' {
  return process.env.OPS_ALERTS_MIN_SEVERITY?.trim() === 'warning' ? 'warning' : 'critical'
}

function severityRank(s: OpsAlert['severity']): number {
  return s === 'critical' ? 2 : 1
}

function categoryLabel(category: OpsAlert['category']): string {
  switch (category) {
    case 'infra': return 'Infra'
    case 'sync': return 'Sync'
    case 'llm': return 'Ava'
    case 'product': return 'Produto'
    default: return category
  }
}

function formatAlertText(alerts: OpsAlert[]): string {
  const lines = alerts.map((a) => {
    const msg = sanitizeOpsToastText(a.message)
    return `- [${a.severity}] ${categoryLabel(a.category)}: ${msg}`
  })
  return `AiyraCare Ops - ${alerts.length} alerta(s)\n${lines.join('\n')}`
}

export function resolveOpsAlertDashboardUrl(): string | undefined {
  const explicit = process.env.OPS_ALERT_DASHBOARD_URL?.trim()
  if (explicit) {
    const url = explicit.replace(/\/$/, '')
    if (/:5173\/ops$/.test(url)) {
      const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
      const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
      return `http://${host}:${port}`
    }
    return url
  }
  const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
  const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
  return `http://${host}:${port}`
}

export function buildOpsAlertDispatchPayload(
  alerts: OpsAlert[],
  checkedAt: string,
  triage?: OpsAlertTriageRow[],
): {
  text: string
  alerts: OpsAlert[]
  checkedAt: string
  dashboardUrl?: string
  triage?: OpsAlertTriageRow[]
  humanRequiredCount?: number
  toast?: OpsAlertToast
} {
  const dashboardUrl = resolveOpsAlertDashboardUrl()
  const humanRequiredCount = triage?.filter((t) => t.humanRequired).length
  const toast = alerts.length > 0 ? buildOpsAlertToast(alerts) : undefined
  return {
    text: formatAlertText(alerts),
    alerts,
    checkedAt,
    ...(dashboardUrl ? { dashboardUrl } : {}),
    ...(triage ? { triage, humanRequiredCount } : {}),
    ...(toast ? { toast } : {}),
  }
}

export class OpsAlertDispatchService {
  private readonly lastSentAt = new Map<string, number>()

  constructor(private readonly metrics: OpsMetricsService) {}

  async checkAndDispatch(): Promise<{
    checkedAt: string
    alertCount: number
    humanRequiredCount: number
    dispatchMode: 'all' | 'human_required'
    dispatched: boolean
    webhookConfigured: boolean
    triage: OpsAlertTriageRow[]
  }> {
    const checkedAt = new Date().toISOString()
    const webhook = process.env.OPS_ALERT_WEBHOOK_URL?.trim()
    const dispatchMode = resolveOpsAlertDispatchMode()
    const { alerts } = await this.metrics.getMetrics()
    const triage = triageOpsAlerts(alerts)
    const humanRequiredCount = triage.filter((t) => t.humanRequired).length
    const min = minSeverity()
    const severityFiltered = alerts.filter((a) => severityRank(a.severity) >= severityRank(min))
    const modeFiltered = filterAlertsForDispatch(severityFiltered, dispatchMode)
    const cooldownMs = Number(process.env.OPS_ALERT_COOLDOWN_MS ?? String(DEFAULT_COOLDOWN_MS))
    const now = Date.now()
    const toSend = modeFiltered.filter((a) => {
      const last = this.lastSentAt.get(a.id)
      return !last || now - last >= cooldownMs
    })

    if (!webhook || toSend.length === 0) {
      return {
        checkedAt,
        alertCount: severityFiltered.length,
        humanRequiredCount,
        dispatchMode,
        dispatched: false,
        webhookConfigured: Boolean(webhook),
        triage,
      }
    }

    const payload = buildOpsAlertDispatchPayload(toSend, checkedAt, triage)
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      throw new Error(`OPS_ALERT_WEBHOOK failed: HTTP ${res.status}`)
    }

    for (const alert of toSend) {
      this.lastSentAt.set(alert.id, now)
    }

    return {
      checkedAt,
      alertCount: severityFiltered.length,
      humanRequiredCount,
      dispatchMode,
      dispatched: true,
      webhookConfigured: true,
      triage,
    }
  }
}
