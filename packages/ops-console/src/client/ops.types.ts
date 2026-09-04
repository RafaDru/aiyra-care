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
  featureHealth24h: FeatureHealthRow[]
  featureCatalog: OpsFeatureCatalogEntry[]
  timeSeries24h: OpsTimeSeries24h
  probe?: OpsProbeSnapshot
  supportReports?: {
    openCount: number
    submitted24h: number
  }
}

export interface SupportReportOpsRow {
  id: string
  accountId: string
  status: string
  category: string
  route: string | null
  descriptionPreview: string | null
  consentTechnical: boolean
  consentProfileAccess: boolean
  hasScreenshot: boolean
  appVersion: string | null
  createdAt: string
  expiresAt: string
  diagnosticContext: Record<string, unknown>
}

export interface RuntimeDegradedView {
  avaLite: boolean
  avaLiteReason: string | null
  degradedRead: boolean
  degradedReadAsOf: string | null
  degradedReadReason: string | null
  syncDegradedPortals: string[]
}

export interface OpsAlertTriageRow {
  alertId: string
  severity: OpsAlertSeverity
  category: OpsAlert['category']
  tier: 'infra' | 'app_sync' | 'llm' | 'product'
  humanRequired: boolean
  reason: string
}

export interface OpsMetricsResponse {
  metrics: OpsMetricsSnapshot
  alerts: OpsAlert[]
  runtime?: RuntimeDegradedView
  triage?: OpsAlertTriageRow[]
}

export interface OpsAlertsDispatchResult {
  checkedAt: string
  alertCount: number
  humanRequiredCount: number
  dispatchMode: 'all' | 'human_required'
  dispatched: boolean
  webhookConfigured: boolean
  triage: OpsAlertTriageRow[]
}

export interface StackServiceStatus {
  up: boolean
  status: number | null
  error?: string | null
  service?: string
  healthStatus?: string
}

export interface StackStatusSnapshot {
  checkedAt: string
  apiPort: number
  webPort: number
  api: StackServiceStatus
  web: StackServiceStatus
}

export interface StackActionResult {
  action: 'status' | 'start' | 'stop' | 'restart'
  message?: string
  status: StackStatusSnapshot
  platform?: string
  error?: string
}
