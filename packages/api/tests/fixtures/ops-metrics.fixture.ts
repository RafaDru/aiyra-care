import type { OpsMetricsSnapshot } from '../../src/domain/ops/ops-metrics.types.js'

/** Snapshot mínimo válido para testes de evaluateOpsAlerts / pipeline. */
export function emptyOpsMetricsSnapshot(): OpsMetricsSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    ava: {
      last24h: {
        windowHours: 24,
        turns: 0,
        tokensTotalSum: 0,
        tokensInSum: 0,
        tokensOutSum: 0,
        p50Tokens: null,
        p95Tokens: null,
      },
      last7d: {
        windowHours: 168,
        turns: 0,
        tokensTotalSum: 0,
        tokensInSum: 0,
        tokensOutSum: 0,
        p50Tokens: null,
        p95Tokens: null,
      },
      providerMix24h: [],
    },
    sync: {
      portalStats24h: [],
      stuckJobs: [],
      recentFailures: [],
    },
    productEvents: {
      last1h: { windowHours: 1, avaChatCompleted: 0, avaChatFailed: 0, avaQuotaBlocked: 0 },
      last5m: { avaChatCompleted: 0, avaChatFailed: 0 },
    },
    errorFingerprints24h: [],
    clientErrorFingerprints24h: [],
    featureHealth24h: [],
    featureCatalog: [],
    timeSeries24h: {
      syncJobs: [],
      avaEvents: [],
      clientErrors: [],
      avaTokens: [],
    },
  }
}
