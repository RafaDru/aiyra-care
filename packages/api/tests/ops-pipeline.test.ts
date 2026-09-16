import { describe, expect, it } from 'vitest'
import { evaluateOpsAlerts } from '../src/domain/ops/ops-alerts.js'
import {
  filterAlertsForDispatch,
  triageOpsAlerts,
} from '../src/domain/ops/ops-alert-triage.js'
import { buildRuntimeStateFromOps } from '../src/application/ops/runtime-degraded.service.js'
import { buildOpsAlertDispatchPayload } from '../src/application/ops/ops-alert-dispatch.service.js'
import { emptyOpsMetricsSnapshot } from './fixtures/ops-metrics.fixture.js'

describe('ops pipeline — alertas → triagem → fallback → payload', () => {
  it('cascade Ava critical dispara pager e ativa Ava lite', () => {
    const snapshot = emptyOpsMetricsSnapshot()
    snapshot.productEvents.last5m = { avaChatCompleted: 0, avaChatFailed: 5 }

    const alerts = evaluateOpsAlerts(snapshot)
    const triage = triageOpsAlerts(alerts)
    const toDispatch = filterAlertsForDispatch(alerts, 'human_required')
    const runtime = buildRuntimeStateFromOps(alerts, snapshot.probe, null)

    expect(alerts.some((a) => a.id === 'llm_cascade_fail')).toBe(true)
    expect(triage.find((t) => t.alertId === 'llm_cascade_fail')?.humanRequired).toBe(true)
    expect(toDispatch.map((a) => a.id)).toEqual(['llm_cascade_fail'])
    expect(runtime.avaLite?.active).toBe(true)
    expect(runtime.avaLite?.reason).toBe('llm_cascade_fail')
  })

  it('quota spike gera alerta mas não pager em human_required', () => {
    const snapshot = emptyOpsMetricsSnapshot()
    snapshot.productEvents.last1h.avaQuotaBlocked = 15

    const alerts = evaluateOpsAlerts(snapshot)
    const toDispatch = filterAlertsForDispatch(alerts, 'human_required')

    expect(alerts.some((a) => a.id === 'llm_quota_spike')).toBe(true)
    expect(toDispatch).toHaveLength(0)
    expect(buildRuntimeStateFromOps(alerts, undefined, null).avaLite?.active).not.toBe(true)
  })

  it('fail rate crítico degrada portal e pager operador', () => {
    const snapshot = emptyOpsMetricsSnapshot()
    snapshot.sync.portalStats24h = [{
      portalType: 'amil',
      total: 10,
      failed: 8,
      success: 2,
      failRatePct: 80,
    }]

    const alerts = evaluateOpsAlerts(snapshot)
    const toDispatch = filterAlertsForDispatch(alerts, 'human_required')
    const runtime = buildRuntimeStateFromOps(alerts, undefined, null)

    expect(alerts.some((a) => a.id === 'sync_fail_rate_amil')).toBe(true)
    expect(toDispatch.some((a) => a.id === 'sync_fail_rate_amil')).toBe(true)
    expect(runtime.portals.some((p) => p.portalType === 'amil')).toBe(true)
  })

  it('fail rate warning não degrada portal automaticamente', () => {
    const snapshot = emptyOpsMetricsSnapshot()
    snapshot.sync.portalStats24h = [{
      portalType: 'unimed_bh',
      total: 5,
      failed: 2,
      success: 3,
      failRatePct: 40,
    }]

    const alerts = evaluateOpsAlerts(snapshot)
    const runtime = buildRuntimeStateFromOps(alerts, undefined, null)

    expect(alerts.some((a) => a.id === 'sync_fail_rate_unimed_bh')).toBe(true)
    expect(runtime.portals.some((p) => p.portalType === 'unimed_bh')).toBe(false)
  })

  it('probe API down → pager + degraded_read', () => {
    const snapshot = emptyOpsMetricsSnapshot()
    snapshot.probe = {
      checkedAt: new Date().toISOString(),
      api: { ok: false, latencyMs: 5000, status: 503 },
      postgres: { ok: true, latencyMs: 10 },
    }

    const alerts = evaluateOpsAlerts(snapshot)
    const toDispatch = filterAlertsForDispatch(alerts, 'human_required')
    const runtime = buildRuntimeStateFromOps(alerts, snapshot.probe, null)

    expect(alerts.some((a) => a.id === 'infra_api_down')).toBe(true)
    expect(toDispatch.some((a) => a.id === 'infra_api_down')).toBe(true)
    expect(runtime.degradedRead?.active).toBe(true)
    expect(runtime.degradedRead?.reason).toBe('infra_probe')
  })

  it('payload de dispatch inclui triagem e dashboard', () => {
    const alerts = evaluateOpsAlerts(emptyOpsMetricsSnapshot())
    alerts.push({
      id: 'sync_stuck_j1',
      severity: 'critical',
      category: 'sync',
      message: 'stuck',
      details: { jobId: 'j1' },
    })
    const triage = triageOpsAlerts(alerts)
    const payload = buildOpsAlertDispatchPayload(
      filterAlertsForDispatch(alerts, 'human_required'),
      '2026-09-02T12:00:00.000Z',
      triage,
    )

    expect(payload.text).toContain('AiyraCare Ops')
    expect(payload.dashboardUrl).toMatch(/3013/)
    expect(payload.triage?.length).toBe(alerts.length)
    expect(payload.humanRequiredCount).toBeGreaterThan(0)
  })
})
