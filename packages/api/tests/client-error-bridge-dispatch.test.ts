import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OpsAnalysisQueueRecord } from '../src/domain/ops/ops-analysis-queue.types.js'
import {
  buildClientErrorBridgeInvestigatorPayload,
  dispatchClientErrorBridgeInvestigator,
  isClientErrorBridgeQueueRecord,
} from '../src/application/ops/client-error-bridge-dispatch.js'
import { buildClientErrorBridgeDispatchPayload } from '../src/application/ops/incident-dispatch-payload.helper.js'

function clientErrorQueueRow(
  overrides: Partial<OpsAnalysisQueueRecord> = {},
): OpsAnalysisQueueRecord {
  return {
    id: 'inc-ce-1',
    referenceCode: 'INC-000099',
    sourceType: 'ops_alert',
    sourceId: 'client_error:fp-abc',
    lane: 'development_support',
    status: 'queued',
    incidentPipelineStatus: 'open',
    recurrenceOfIncidentId: null,
    recurrenceOfReferenceCode: null,
    recurrenceKind: null,
    priority: 'normal',
    deploymentTier: 'integration',
    title: 'Client error · patient_wallet · HTTP_503',
    errorSummary: 'HTTP_503',
    contextSnapshot: {
      severity: 'warning',
      category: 'product',
      incidentOrigin: 'client_error_bridge',
      fingerprint: 'fp-abc',
      feature: 'patient_wallet',
      errorKind: 'api',
      route: '/patients/1',
    },
    remediationSummary: null,
    analysisArtifactPath: null,
    prUrl: null,
    analysisLastError: null,
    operatorNotes: null,
    investigationTrigger: 'auto',
    queuedAt: '2026-10-13T12:00:00.000Z',
    investigationRequestedAt: null,
    completedAt: null,
    createdAt: '2026-10-13T12:00:00.000Z',
    updatedAt: '2026-10-13T12:00:00.000Z',
    ...overrides,
  }
}

describe('client-error-bridge-dispatch', () => {
  afterEach(() => {
    delete process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY
    delete process.env.CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY
    vi.unstubAllGlobals()
  })

  it('detects bridge queue rows', () => {
    expect(isClientErrorBridgeQueueRecord(clientErrorQueueRow())).toBe(true)
    expect(
      isClientErrorBridgeQueueRecord(
        clientErrorQueueRow({ contextSnapshot: { incidentOrigin: 'alerta_ops' } }),
      ),
    ).toBe(false)
  })

  it('builds support_report-style payload for Triador Dev', () => {
    const payload = buildClientErrorBridgeInvestigatorPayload(clientErrorQueueRow(), {
      trigger: 'auto',
      investigationId: 'inc-ce-1',
      callbackUrl: 'http://127.0.0.1:3010/callback',
      triageStartedUrl: 'http://127.0.0.1:3013/api/analysis-queue/inc-ce-1/triage-started',
    })
    expect(payload.type).toBe('support_report')
    expect(payload.reportId).toBe('client_error:fp-abc')
    expect(payload.topFingerprint).toBe('fp-abc')
    expect(payload.category).toBe('technical_bug')
    expect(payload.analysisQueue).toMatchObject({ lane: 'development_support' })
  })

  it('outbox payload uses client_error_bridge kind (not SRE ops_alert)', () => {
    const row = clientErrorQueueRow()
    const outbox = buildClientErrorBridgeDispatchPayload(row)
    expect(outbox.kind).toBe('client_error_bridge_triage_v1')
  })

  it('dispatches via development support webhook only', async () => {
    process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/dev'
    process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY = 'crsr_dev'
    process.env.CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/sre'
    process.env.CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY = 'crsr_sre'

    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await dispatchClientErrorBridgeInvestigator(clientErrorQueueRow(), {
      trigger: 'auto',
      analysisQueue: {
        id: 'inc-ce-1',
        callbackUrl: 'http://127.0.0.1:3010/cb',
        triageStartedUrl: 'http://127.0.0.1:3013/triage-started',
      },
    })
    expect(result).toEqual({ outcome: 'sent' })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://127.0.0.1:3099/dev')
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.type).toBe('support_report')
  })
})
