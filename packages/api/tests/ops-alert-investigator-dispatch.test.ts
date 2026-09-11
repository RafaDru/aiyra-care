import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildOpsAlertInvestigatorPayload,
  dispatchOpsAlertInvestigator,
  shouldAutoInvestigateOpsAlert,
} from '../src/application/ops/ops-alert-investigator-dispatch.js'

describe('ops-alert-investigator-dispatch', () => {
  afterEach(() => {
    delete process.env.CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY
    delete process.env.OPS_ALERT_INVESTIGATOR_AUTO
    vi.unstubAllGlobals()
  })

  it('builds ops_alert payload with investigation metadata', () => {
    const payload = buildOpsAlertInvestigatorPayload(
      {
        id: 'infra_api_down',
        severity: 'critical',
        category: 'infra',
        message: 'API down',
        details: { latencyMs: 9000 },
      },
      {
        checkedAt: '2026-09-08T12:00:00.000Z',
        trigger: 'manual',
        operatorNotes: 'reiniciei stack',
      },
    )
    expect(payload.type).toBe('ops_alert')
    expect(payload.alertId).toBe('infra_api_down')
    expect(payload.investigation).toEqual({ tier: 0, playbook: 'ops-alert-tier0', trigger: 'manual' })
    expect(payload.operatorNotes).toBe('reiniciei stack')
    expect(payload.details).toEqual({ latencyMs: 9000 })
  })

  it('auto-investigate only infra critical human required', () => {
    expect(shouldAutoInvestigateOpsAlert(
      { id: 'infra_api_down', severity: 'critical', category: 'infra', message: 'x' },
      { alertId: 'infra_api_down', severity: 'critical', category: 'infra', tier: 'infra', humanRequired: true, reason: 'critical' },
    )).toBe(true)
    expect(shouldAutoInvestigateOpsAlert(
      { id: 'infra_api_slow', severity: 'warning', category: 'infra', message: 'x' },
      { alertId: 'infra_api_slow', severity: 'warning', category: 'infra', tier: 'infra', humanRequired: false, reason: 'auto' },
    )).toBe(false)
    expect(shouldAutoInvestigateOpsAlert(
      { id: 'llm_cascade_fail', severity: 'critical', category: 'llm', message: 'x' },
    )).toBe(false)
  })

  it('dispatches when support automation webhook configured', async () => {
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/cursor-automation'
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY = 'crsr_test_key'
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await dispatchOpsAlertInvestigator(
      { id: 'infra_postgres_down', severity: 'critical', category: 'infra', message: 'PG down' },
      { checkedAt: '2026-09-08T12:00:00.000Z', trigger: 'auto' },
    )
    expect(result).toEqual({ outcome: 'sent' })
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.type).toBe('ops_alert')
    expect(body.investigation.trigger).toBe('auto')
  })
})
