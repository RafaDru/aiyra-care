import { describe, expect, it } from 'vitest'
import { evaluateOpsAlerts } from '../src/domain/ops/ops-alerts.js'
import type { OpsMetricsSnapshot } from '../src/domain/ops/ops-metrics.types.js'

function emptySnapshot(): OpsMetricsSnapshot {
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
  }
}

describe('evaluateOpsAlerts', () => {
  it('flags sync stuck jobs over 30 minutes', () => {
    const snapshot = emptySnapshot()
    snapshot.sync.stuckJobs = [{
      jobId: 'j1',
      integrationLinkId: 'l1',
      portalType: 'unimed',
      status: 'running',
      startedAt: new Date().toISOString(),
      minutesRunning: 45,
    }]
    const alerts = evaluateOpsAlerts(snapshot)
    expect(alerts.some((a) => a.id === 'sync_stuck_j1')).toBe(true)
  })

  it('flags high sync fail rate by portal', () => {
    const snapshot = emptySnapshot()
    snapshot.sync.portalStats24h = [{
      portalType: 'amil',
      total: 5,
      failed: 4,
      success: 1,
      failRatePct: 80,
    }]
    const alerts = evaluateOpsAlerts(snapshot)
    expect(alerts.some((a) => a.id === 'sync_fail_rate_amil')).toBe(true)
  })

  it('flags LLM cascade when many failures without success in 5m', () => {
    const snapshot = emptySnapshot()
    snapshot.productEvents.last5m = { avaChatCompleted: 0, avaChatFailed: 5 }
    const alerts = evaluateOpsAlerts(snapshot)
    expect(alerts.some((a) => a.id === 'llm_cascade_fail')).toBe(true)
  })

  it('flags quota spike', () => {
    const snapshot = emptySnapshot()
    snapshot.productEvents.last1h.avaQuotaBlocked = 12
    const alerts = evaluateOpsAlerts(snapshot)
    expect(alerts.some((a) => a.id === 'llm_quota_spike')).toBe(true)
  })

  it('flags infra probe api down', () => {
    const snapshot = emptySnapshot()
    snapshot.probe = {
      checkedAt: new Date().toISOString(),
      api: { ok: false, latencyMs: 100, status: 503 },
      postgres: { ok: true, latencyMs: 12 },
    }
    const alerts = evaluateOpsAlerts(snapshot)
    expect(alerts.some((a) => a.id === 'infra_api_down')).toBe(true)
  })

  it('flags infra probe postgres slow', () => {
    const snapshot = emptySnapshot()
    snapshot.probe = {
      checkedAt: new Date().toISOString(),
      api: { ok: true, latencyMs: 50 },
      postgres: { ok: true, latencyMs: 800 },
    }
    const alerts = evaluateOpsAlerts(snapshot)
    expect(alerts.some((a) => a.id === 'infra_postgres_slow')).toBe(true)
  })
})
