import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type { OpsMetricsService } from './ops-metrics.service.js'

const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000

function minSeverity(): 'warning' | 'critical' {
  return process.env.OPS_ALERTS_MIN_SEVERITY?.trim() === 'warning' ? 'warning' : 'critical'
}

function severityRank(s: OpsAlert['severity']): number {
  return s === 'critical' ? 2 : 1
}

function formatAlertText(alerts: OpsAlert[]): string {
  const lines = alerts.map((a) => `• [${a.severity}] ${a.category}: ${a.message}`)
  return `AiyraCare ops — ${alerts.length} alerta(s)\n${lines.join('\n')}`
}

export function resolveOpsAlertDashboardUrl(): string | undefined {
  const explicit = process.env.OPS_ALERT_DASHBOARD_URL?.trim()
  if (explicit) return explicit
  const web = process.env.LANDING_CAPTURE_WEB_URL?.trim()
  if (web) return `${web.replace(/\/$/, '')}/ops`
  const api = process.env.API_PUBLIC_URL?.trim()
  if (api?.includes('localhost:5173')) return `${api.replace(/\/$/, '')}/ops`
  return undefined
}

export function buildOpsAlertDispatchPayload(
  alerts: OpsAlert[],
  checkedAt: string,
): { text: string; alerts: OpsAlert[]; checkedAt: string; dashboardUrl?: string } {
  const dashboardUrl = resolveOpsAlertDashboardUrl()
  return {
    text: formatAlertText(alerts),
    alerts,
    checkedAt,
    ...(dashboardUrl ? { dashboardUrl } : {}),
  }
}

export class OpsAlertDispatchService {
  private readonly lastSentAt = new Map<string, number>()

  constructor(private readonly metrics: OpsMetricsService) {}

  async checkAndDispatch(): Promise<{
    checkedAt: string
    alertCount: number
    dispatched: boolean
    webhookConfigured: boolean
  }> {
    const checkedAt = new Date().toISOString()
    const webhook = process.env.OPS_ALERT_WEBHOOK_URL?.trim()
    const { alerts } = await this.metrics.getMetrics()
    const min = minSeverity()
    const eligible = alerts.filter((a) => severityRank(a.severity) >= severityRank(min))
    const cooldownMs = Number(process.env.OPS_ALERT_COOLDOWN_MS ?? String(DEFAULT_COOLDOWN_MS))
    const now = Date.now()
    const toSend = eligible.filter((a) => {
      const last = this.lastSentAt.get(a.id)
      return !last || now - last >= cooldownMs
    })

    if (!webhook || toSend.length === 0) {
      return {
        checkedAt,
        alertCount: eligible.length,
        dispatched: false,
        webhookConfigured: Boolean(webhook),
      }
    }

    const payload = buildOpsAlertDispatchPayload(toSend, checkedAt)
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
      alertCount: eligible.length,
      dispatched: true,
      webhookConfigured: true,
    }
  }
}
