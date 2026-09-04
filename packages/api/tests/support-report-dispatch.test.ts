import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildSupportReportDispatchPayload,
  dispatchSupportReport,
  resolveSupportReportWebhookUrl,
} from '../src/application/support-report/support-report-dispatch.js'

describe('support-report-dispatch', () => {
  afterEach(() => {
    delete process.env.SUPPORT_REPORT_WEBHOOK_URL
    delete process.env.OPS_ALERT_WEBHOOK_URL
    delete process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY
    vi.unstubAllGlobals()
  })

  it('prefers SUPPORT_REPORT_WEBHOOK_URL over OPS_ALERT_WEBHOOK_URL', () => {
    process.env.SUPPORT_REPORT_WEBHOOK_URL = 'http://support.test/hook'
    process.env.OPS_ALERT_WEBHOOK_URL = 'http://ops.test/hook'
    expect(resolveSupportReportWebhookUrl()).toBe('http://support.test/hook')
  })

  it('builds payload without description or account id', () => {
    const payload = buildSupportReportDispatchPayload({
      id: 'rep-uuid',
      accountId: 'acc-secret',
      status: 'open',
      category: 'technical_bug',
      description: 'febre alta PHI',
      route: '/patients/x',
      sessionId: null,
      patientId: null,
      consentTechnical: true,
      consentScreenshot: false,
      consentProfileAccess: false,
      profileAccessUntil: null,
      diagnosticContext: {
        recentClientErrors: [{ fingerprint: 'abc123def456' }],
      },
      hasScreenshot: false,
      appVersion: '0.1.0',
      userAgent: null,
      expiresAt: new Date(),
      resolvedAt: null,
      createdAt: new Date('2026-09-04T12:00:00Z'),
      updatedAt: new Date(),
    })
    expect(payload).toMatchObject({
      type: 'support_report',
      reportId: 'rep-uuid',
      category: 'technical_bug',
      route: '/patients/x',
      topFingerprint: 'abc123def456',
      toast: { title: 'AiyraCare | Novo chamado', icon: 'info' },
      text: 'Novo chamado: Bug técnico — /patients/x',
    })
    expect(payload.dashboardUrl).toContain('tab=support')
    expect(JSON.stringify(payload)).not.toContain('febre')
    expect(JSON.stringify(payload)).not.toContain('acc-secret')
  })

  it('posts to webhook when configured', async () => {
    process.env.SUPPORT_REPORT_WEBHOOK_URL = 'http://127.0.0.1:3022/ops-alert'
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const ok = await dispatchSupportReport({
      id: 'rep-1',
      accountId: 'acc-1',
      status: 'open',
      category: 'other',
      description: null,
      route: '/',
      sessionId: null,
      patientId: null,
      consentTechnical: false,
      consentScreenshot: false,
      consentProfileAccess: false,
      profileAccessUntil: null,
      diagnosticContext: {},
      hasScreenshot: false,
      appVersion: null,
      userAgent: null,
      expiresAt: new Date(),
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.type).toBe('support_report')
    expect(body.reportId).toBe('rep-1')
  })

  it('dispatches investigator payload when CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL set', async () => {
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/cursor-automation'
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY = 'crsr_test_key'
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const record = {
      id: 'rep-inv-1',
      accountId: 'acc-1',
      status: 'open' as const,
      category: 'ux_confusion',
      description: null,
      route: '/settings/family',
      sessionId: null,
      patientId: null,
      consentTechnical: false,
      consentScreenshot: false,
      consentProfileAccess: false,
      profileAccessUntil: null,
      diagnosticContext: {},
      hasScreenshot: false,
      appVersion: null,
      userAgent: null,
      expiresAt: new Date(),
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const { dispatchSupportReportInvestigator } = await import(
      '../src/application/support-report/support-report-dispatch.js'
    )
    const ok = await dispatchSupportReportInvestigator(record)
    expect(ok).toBe(true)
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.investigation).toEqual({ tier: 0, playbook: 'support-report-tier0' })
    expect(body.reportId).toBe('rep-inv-1')
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer crsr_test_key')
  })

  it('dispatchSupportReportNotifications tolerates partial failure', async () => {
    process.env.OPS_ALERT_WEBHOOK_URL = 'http://127.0.0.1:3012/ops-alert'
    delete process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const record = {
      id: 'rep-2',
      accountId: 'acc-1',
      status: 'open' as const,
      category: 'other',
      description: null,
      route: null,
      sessionId: null,
      patientId: null,
      consentTechnical: false,
      consentScreenshot: false,
      consentProfileAccess: false,
      profileAccessUntil: null,
      diagnosticContext: {},
      hasScreenshot: false,
      appVersion: null,
      userAgent: null,
      expiresAt: new Date(),
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const { dispatchSupportReportNotifications } = await import(
      '../src/application/support-report/support-report-dispatch.js'
    )
    const result = await dispatchSupportReportNotifications(record)
    expect(result.notifier).toBe(true)
    expect(result.investigator).toBe(false)
  })
})
