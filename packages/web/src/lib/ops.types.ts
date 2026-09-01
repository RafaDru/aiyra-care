export type OpsAlertSeverity = 'warning' | 'critical'

export interface OpsAlert {
  id: string
  severity: OpsAlertSeverity
  category: 'sync' | 'llm' | 'product' | 'infra'
  message: string
  details?: Record<string, unknown>
}

export interface OpsProbeSnapshot {
  checkedAt: string
  api: { ok: boolean; latencyMs: number; status?: number; error?: string }
  postgres: { ok: boolean; latencyMs: number; error?: string }
  neo4j?: { ok: boolean; latencyMs: number; error?: string }
}

export interface ClientErrorFingerprintRow {
  fingerprint: string
  feature: string
  errorKind: string
  errorCode: string
  count: number
  accountCount: number
  lastSeenAt: string
}

export interface SyncPortalStatsRow {
  portalType: string
  total: number
  failed: number
  success: number
  failRatePct: number
}

export interface OpsMetricsResponse {
  metrics: {
    generatedAt: string
    sync: {
      portalStats24h: SyncPortalStatsRow[]
      stuckJobs: Array<{
        jobId: string
        portalType: string
        minutesRunning: number
        status: string
      }>
      recentFailures: Array<{
        jobId: string
        portalType: string
        error: string | null
        finishedAt: string
      }>
    }
    productEvents: {
      last1h: { avaChatCompleted: number; avaChatFailed: number; avaQuotaBlocked: number }
      last5m: { avaChatCompleted: number; avaChatFailed: number }
    }
    clientErrorFingerprints24h: ClientErrorFingerprintRow[]
    errorFingerprints24h: Array<{
      eventName: string
      fingerprint: string
      count: number
      lastSeenAt: string
    }>
    probe?: OpsProbeSnapshot
  }
  alerts: OpsAlert[]
}

export interface OpsAlertsDispatchResult {
  checkedAt: string
  alertCount: number
  dispatched: boolean
  webhookConfigured: boolean
}
