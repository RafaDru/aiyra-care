import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { buildRuntimeStateFromOps } from '../src/application/ops/runtime-degraded.service.js'
import type { OpsAlert } from '../src/domain/ops/ops-metrics.types.js'
import { PORTAL_DEGRADED_TTL_MS } from '../src/domain/ops/runtime-degraded.types.js'

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

  it('sync stuck alert não pausa portal sozinho', () => {
    const alerts: OpsAlert[] = [{
      id: 'sync_stuck_j1',
      severity: 'critical',
      category: 'sync',
      message: 'stuck',
      details: { portalType: 'amil', jobId: 'j1' },
    }]
    const state = buildRuntimeStateFromOps(alerts, undefined, null)
    expect(state.portals.some((p) => p.portalType === 'amil')).toBe(false)
  })

  it('merge portal degraded de alertas consecutivos', () => {
    const alerts: OpsAlert[] = [{
      id: 'sync_fail_rate_hermes_pardini',
      severity: 'critical',
      category: 'sync',
      message: 'fail',
      details: { portalType: 'hermes_pardini', failRatePct: 90, total: 6, failed: 5 },
    }]
    const state = buildRuntimeStateFromOps(alerts, undefined, null)
    const entry = state.portals.find((p) => p.portalType === 'hermes_pardini')
    expect(entry?.reason).toBe('fail_rate')
    expect(entry?.until).toBeTruthy()
    const untilMs = new Date(entry!.until!).getTime()
    expect(untilMs - Date.now()).toBeLessThanOrEqual(PORTAL_DEGRADED_TTL_MS + 1000)
  })

  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  it('SYNC_DEGRADED_PORTALS força portal na lista', () => {
    process.env.SYNC_DEGRADED_PORTALS = 'amil'
    const state = buildRuntimeStateFromOps([], undefined, null)
    expect(state.portals.some((p) => p.portalType === 'amil' && p.reason === 'env')).toBe(true)
  })

  it('AVA_LITE_MODE força Ava lite sem alerta', () => {
    process.env.AVA_LITE_MODE = '1'
    const state = buildRuntimeStateFromOps([], undefined, null)
    expect(state.avaLite?.active).toBe(true)
    expect(state.avaLite?.reason).toBe('env')
  })
})
