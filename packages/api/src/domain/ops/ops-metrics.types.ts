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

export interface ErrorFingerprintRow {
  eventName: string
  fingerprint: string
  count: number
  lastSeenAt: string
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

export interface FeatureHealthRow {
  featureKey: string
  label: string
  area: string
  section: 'infra' | 'product' | 'sync' | 'ava' | 'cost'
  routeExample?: string
  usageEvents24h: number
  usageSessions24h: number
  errorCount24h: number
  accountCount24h: number
  failRatePct: number
  signal: 'hot' | 'errors_only' | 'ok' | 'low_signal'
}

export interface OpsFeatureCatalogEntry {
  key: string
  label: string
  area: string
  section: FeatureHealthRow['section']
  routeExample?: string
  description?: string
}

export interface OpsHourlyBucket {
  hour: string
  label: string
}

export interface OpsHourlySyncBucket extends OpsHourlyBucket {
  success: number
  failed: number
}

export interface OpsHourlyAvaEventBucket extends OpsHourlyBucket {
  completed: number
  failed: number
  quotaBlocked: number
}

export interface OpsHourlyCountBucket extends OpsHourlyBucket {
  count: number
}

export interface OpsHourlyAvaTokensBucket extends OpsHourlyBucket {
  turns: number
  tokens: number
}

export interface OpsTimeSeries24h {
  syncJobs: OpsHourlySyncBucket[]
  avaEvents: OpsHourlyAvaEventBucket[]
  clientErrors: OpsHourlyCountBucket[]
  avaTokens: OpsHourlyAvaTokensBucket[]
}

export interface OpsProbeSnapshot {
  checkedAt: string
  api: {
    ok: boolean
    latencyMs: number
    status?: number
    error?: string
  }
  postgres: {
    ok: boolean
    latencyMs: number
    error?: string
  }
  neo4j?: {
    ok: boolean
    latencyMs: number
    error?: string
  }
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
  clientErrorFingerprints24h: ClientErrorFingerprintRow[]
  featureHealth24h: FeatureHealthRow[]
  featureCatalog: OpsFeatureCatalogEntry[]
  timeSeries24h: OpsTimeSeries24h
  probe?: OpsProbeSnapshot
  ops?: {
    workerLastTickAt: string | null
    workerStaleMinutes: number | null
    stripeWebhookRejected1h: number
  }
}

export type OpsAlertSeverity = 'warning' | 'critical'

export interface OpsAlert {
  id: string
  severity: OpsAlertSeverity
  category: 'sync' | 'llm' | 'product' | 'infra'
  message: string
  details?: Record<string, unknown>
}
