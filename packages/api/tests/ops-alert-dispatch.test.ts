import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  buildOpsAlertDispatchPayload,
  resolveOpsAlertDashboardUrl,
  OpsAlertDispatchService,
} from '../src/application/ops/ops-alert-dispatch.service.js'

describe('ops alert dispatch payload', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  it('redirects legacy dashboard URL to ops-console', () => {
    process.env.OPS_ALERT_DASHBOARD_URL = 'http://localhost:5173/ops'
    const payload = buildOpsAlertDispatchPayload(
      [{ id: 'a1', severity: 'critical', category: 'sync', message: 'fail' }],
      '2026-01-01T00:00:00.000Z',
    )
    expect(payload.dashboardUrl).toBe('http://127.0.0.1:3013')
    expect(payload.text).toContain('AiyraCare Ops')
    expect(payload.toast?.title).toContain('CRITICO')
    expect(payload.toast?.icon).toBe('error')
  })

  it('defaults dashboard to ops-console when unset', () => {
    delete process.env.OPS_ALERT_DASHBOARD_URL
    delete process.env.OPS_CONSOLE_PORT
    expect(resolveOpsAlertDashboardUrl()).toBe('http://127.0.0.1:3013')
  })
})

describe('OpsAlertDispatchService', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true })
    process.env.OPS_ALERT_WEBHOOK_URL = 'http://127.0.0.1:3012/ops-alert'
    process.env.OPS_ALERT_DASHBOARD_URL = 'http://127.0.0.1:3013'
    process.env.OPS_ALERTS_DISPATCH_MODE = 'all'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPS_ALERT_WEBHOOK_URL
    delete process.env.OPS_ALERT_DASHBOARD_URL
    delete process.env.OPS_ALERTS_DISPATCH_MODE
  })

  it('posts dashboardUrl in webhook body', async () => {
    const metrics = {
      getMetrics: vi.fn().mockResolvedValue({
        metrics: { generatedAt: '2026-01-01T00:00:00.000Z' },
        alerts: [{
          id: 'llm_cascade_fail',
          severity: 'critical',
          category: 'llm',
          message: 'cascade',
        }],
      }),
    }
    const svc = new OpsAlertDispatchService(metrics as never)
    const result = await svc.checkAndDispatch()
    expect(result.dispatched).toBe(true)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body))
    expect(body.dashboardUrl).toBe('http://127.0.0.1:3013')
    expect(body.alerts.length).toBe(1)
    expect(body.triage).toBeDefined()
    expect(body.toast?.icon).toBe('error')
  })

  it('human_required mode skips non-human warnings', async () => {
    process.env.OPS_ALERTS_DISPATCH_MODE = 'human_required'
    const metrics = {
      getMetrics: vi.fn().mockResolvedValue({
        metrics: { generatedAt: '2026-01-01T00:00:00.000Z' },
        alerts: [
          {
            id: 'llm_quota_spike',
            severity: 'warning',
            category: 'product',
            message: 'quota',
          },
        ],
      }),
    }
    const svc = new OpsAlertDispatchService(metrics as never)
    const result = await svc.checkAndDispatch()
    expect(result.dispatched).toBe(false)
    expect(result.humanRequiredCount).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
