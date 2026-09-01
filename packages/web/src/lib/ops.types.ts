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

export interface AvaTokenPercentiles {
  windowHours: number
  turns: number
  tokensTotalSum: number
  tokensInSum: number
  tokensOutSum: number
  p50Tokens: number | null
  p95Tokens: number | null
}

export interface AvaProviderMixRow {
  provider: string
  model: string
  turns: number
  tokensTotal: number
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

export interface ErrorFingerprintRow {
  eventName: string
  fingerprint: string
  count: number
  lastSeenAt: string
}

export interface SyncPortalStatsRow {
  portalType: string
  total: number
  failed: number
  success: number
  failRatePct: number
}

export interface SyncStuckJobRow {
  jobId: string
  integrationLinkId: string
  portalType: string
  status: string
  startedAt: string
  minutesRunning: number
}

export interface SyncRecentFailureRow {
  jobId: string
  portalType: string
  integrationLinkId: string
  error: string | null
  finishedAt: string
}

export interface OpsInternalLlmSnapshot {
  calls: number
  llmResolved: number
  localFallback: number
  budgetExhausted: number
  totalCostUsdCents: number
  monthlyBudgetBrlCents: number
  spentBrlCents: number
  remainingBrlCents: number
  exhausted: boolean
}

export interface OpsMetricsSnapshot {
  generatedAt: string
  ava: {
    last24h: AvaTokenPercentiles
    last7d: AvaTokenPercentiles
    providerMix24h: AvaProviderMixRow[]
  }
  sync: {
    portalStats24h: SyncPortalStatsRow[]
    stuckJobs: SyncStuckJobRow[]
    recentFailures: SyncRecentFailureRow[]
  }
  productEvents: {
    last1h: {
      windowHours: number
      avaChatCompleted: number
      avaChatFailed: number
      avaQuotaBlocked: number
    }
    last5m: {
      avaChatCompleted: number
      avaChatFailed: number
    }
  }
  internalLlm?: OpsInternalLlmSnapshot
  errorFingerprints24h: ErrorFingerprintRow[]
  clientErrorFingerprints24h: ClientErrorFingerprintRow[]
  probe?: OpsProbeSnapshot
}

export interface OpsMetricsResponse {
  metrics: OpsMetricsSnapshot
  alerts: OpsAlert[]
}

export interface OpsAlertsDispatchResult {
  checkedAt: string
  alertCount: number
  dispatched: boolean
  webhookConfigured: boolean
}
