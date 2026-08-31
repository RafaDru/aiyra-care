import { describe, expect, it } from 'vitest'
import { buildRuntimeStateFromOps } from '../src/application/ops/runtime-degraded.service.js'
import type { OpsAlert } from '../src/domain/ops/ops-metrics.types.js'

describe('buildRuntimeStateFromOps', () => {
  it('marca portal degraded em fail rate crítico', () => {
    const alerts: OpsAlert[] = [{
      id: 'sync_fail_rate_amil',
      severity: 'critical',
      category: 'sync',
      message: 'fail',
      details: { portalType: 'amil', failRatePct: 80, total: 5, failed: 4 },
    }]
    const state = buildRuntimeStateFromOps(alerts, undefined, null)
    expect(state.portals.some((p) => p.portalType === 'amil')).toBe(true)
  })

  it('ativa Ava lite em llm_cascade_fail', () => {
    const alerts: OpsAlert[] = [{
      id: 'llm_cascade_fail',
      severity: 'critical',
      category: 'llm',
      message: 'cascade',
    }]
    const state = buildRuntimeStateFromOps(alerts, undefined, null)
    expect(state.avaLite?.active).toBe(true)
  })

  it('ativa degraded_read quando probe degradado', () => {
    const probe = {
      checkedAt: new Date().toISOString(),
      api: { ok: false, latencyMs: 5000 },
      postgres: { ok: true, latencyMs: 10 },
    }
    const state = buildRuntimeStateFromOps([], probe, null)
    expect(state.degradedRead?.active).toBe(true)
    expect(state.degradedRead?.asOf).toBeTruthy()
  })
})
