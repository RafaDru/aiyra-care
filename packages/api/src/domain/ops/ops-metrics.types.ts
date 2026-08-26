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

export interface ProductEventCounts {
  windowHours: number
  avaChatCompleted: number
  avaChatFailed: number
  avaQuotaBlocked: number
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
    last1h: ProductEventCounts
    last5m: Pick<ProductEventCounts, 'avaChatCompleted' | 'avaChatFailed'>
  }
  internalLlm?: {
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
  errorFingerprints24h: ErrorFingerprintRow[]
}

export interface ErrorFingerprintRow {
  eventName: string
  fingerprint: string
  count: number
  lastSeenAt: string
}

export type OpsAlertSeverity = 'warning' | 'critical'

export interface OpsAlert {
  id: string
  severity: OpsAlertSeverity
  category: 'sync' | 'llm' | 'product'
  message: string
  details?: Record<string, unknown>
}
