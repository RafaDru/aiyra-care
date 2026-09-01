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

  it('includes dashboardUrl from OPS_ALERT_DASHBOARD_URL', () => {
    process.env.OPS_ALERT_DASHBOARD_URL = 'http://localhost:5173/ops'
    const payload = buildOpsAlertDispatchPayload(
      [{ id: 'a1', severity: 'critical', category: 'sync', message: 'fail' }],
      '2026-01-01T00:00:00.000Z',
    )
    expect(payload.dashboardUrl).toBe('http://localhost:5173/ops')
    expect(payload.text).toContain('AiyraCare ops')
  })

  it('derives dashboard from LANDING_CAPTURE_WEB_URL', () => {
    delete process.env.OPS_ALERT_DASHBOARD_URL
    process.env.LANDING_CAPTURE_WEB_URL = 'http://localhost:5173'
    expect(resolveOpsAlertDashboardUrl()).toBe('http://localhost:5173/ops')
  })
})

describe('OpsAlertDispatchService', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true })
    process.env.OPS_ALERT_WEBHOOK_URL = 'http://127.0.0.1:3012/ops-alert'
    process.env.OPS_ALERT_DASHBOARD_URL = 'http://localhost:5173/ops'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPS_ALERT_WEBHOOK_URL
    delete process.env.OPS_ALERT_DASHBOARD_URL
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
    expect(body.dashboardUrl).toBe('http://localhost:5173/ops')
    expect(body.alerts.length).toBe(1)
  })
})
