import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpsAnalysisQueueService } from '../src/application/ops/ops-analysis-queue.service.js'
import { postAnalysisQueueTriageStarted } from '../src/application/ops/ops-analysis-triage-started.http.js'
import type { OpsAnalysisQueueRecord } from '../src/domain/ops/ops-analysis-queue.types.js'

function queueRecord(overrides: Partial<OpsAnalysisQueueRecord> = {}): OpsAnalysisQueueRecord {
  return {
    id: 'q-1',
    referenceCode: 'INC-000007',
    sourceType: 'support_report',
    sourceId: 'rep-1',
    lane: 'development_support',
    status: 'queued',
    incidentPipelineStatus: 'forwarded',
    recurrenceOfIncidentId: null,
    recurrenceOfReferenceCode: null,
    recurrenceKind: null,
    priority: 'normal',
    deploymentTier: 'integration',
    title: 't',
    errorSummary: null,
    contextSnapshot: {},
    remediationSummary: null,
    analysisArtifactPath: null,
    prUrl: null,
    analysisLastError: null,
    operatorNotes: null,
    investigationTrigger: 'auto',
    queuedAt: new Date().toISOString(),
    investigationRequestedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function mockRepo(record: OpsAnalysisQueueRecord | null, extra: Record<string, unknown> = {}) {
  return {
    findById: vi.fn(async () => record),
    markPipelineInTriage: vi.fn(async () => undefined),
    markInvestigating: vi.fn(async () => undefined),
    ...extra,
  }
}

describe('OpsAnalysisQueueService.markTriageStarted', () => {
  it('marks in_triage from forwarded and sets investigating', async () => {
    const record = queueRecord()
    const repo = mockRepo(record)
    const svc = new OpsAnalysisQueueService(repo as never)

    const result = await svc.markTriageStarted('q-1')

    expect(result).toEqual({ ok: true, incidentPipelineStatus: 'in_triage' })
    expect(repo.markPipelineInTriage).toHaveBeenCalledWith('q-1')
    expect(repo.markInvestigating).toHaveBeenCalledWith('q-1')
  })

  it('is idempotent when already in_triage', async () => {
    const record = queueRecord({ incidentPipelineStatus: 'in_triage', status: 'investigating' })
    const repo = mockRepo(record)
    const svc = new OpsAnalysisQueueService(repo as never)

    const result = await svc.markTriageStarted('q-1')

    expect(result).toEqual({ ok: true, incidentPipelineStatus: 'in_triage', noop: true })
    expect(repo.markPipelineInTriage).not.toHaveBeenCalled()
  })

  it('noops for triaged, resolved, dismissed', async () => {
    for (const pipeline of ['triaged', 'resolved', 'dismissed'] as const) {
      const repo = mockRepo(queueRecord({ incidentPipelineStatus: pipeline }))
      const svc = new OpsAnalysisQueueService(repo as never)
      const result = await svc.markTriageStarted('q-1')
      expect(result.ok).toBe(true)
      expect(repo.markPipelineInTriage).not.toHaveBeenCalled()
    }
  })

  it('allows open + investigating edge', async () => {
    const record = queueRecord({ incidentPipelineStatus: 'open', status: 'investigating' })
    const repo = mockRepo(record)
    const svc = new OpsAnalysisQueueService(repo as never)

    const result = await svc.markTriageStarted('q-1')

    expect(result.ok).toBe(true)
    expect(repo.markPipelineInTriage).toHaveBeenCalled()
    expect(repo.markInvestigating).not.toHaveBeenCalled()
  })

  it('returns not_found when missing', async () => {
    const repo = mockRepo(null)
    const svc = new OpsAnalysisQueueService(repo as never)
    expect(await svc.markTriageStarted('missing')).toEqual({ ok: false, error: 'not_found' })
  })

  it('rejects open without investigating', async () => {
    const repo = mockRepo(queueRecord({ incidentPipelineStatus: 'open', status: 'queued' }))
    const svc = new OpsAnalysisQueueService(repo as never)
    const result = await svc.markTriageStarted('q-1')
    expect(result).toMatchObject({ ok: false, error: 'invalid_state' })
  })

  it('rejects dispatch_failed', async () => {
    const repo = mockRepo(queueRecord({ incidentPipelineStatus: 'dispatch_failed' }))
    const svc = new OpsAnalysisQueueService(repo as never)
    const result = await svc.markTriageStarted('q-1')
    expect(result).toMatchObject({ ok: false, error: 'invalid_state' })
  })
})

describe('postAnalysisQueueTriageStarted', () => {
  afterEach(() => {
    delete process.env.OPS_INVESTIGATOR_CALLBACK_KEY
    delete process.env.OPS_METRICS_KEY
  })

  it('returns 401 without callback key', async () => {
    const svc = { markTriageStarted: vi.fn() } as unknown as OpsAnalysisQueueService
    const res = await postAnalysisQueueTriageStarted(svc, 'q-1', {})
    expect(res.statusCode).toBe(401)
    expect(svc.markTriageStarted).not.toHaveBeenCalled()
  })

  it('returns 200 with authorized header', async () => {
    process.env.OPS_INVESTIGATOR_CALLBACK_KEY = 'secret-key'
    const markTriageStarted = vi.fn(async () => ({
      ok: true as const,
      incidentPipelineStatus: 'in_triage' as const,
    }))
    const svc = { markTriageStarted } as unknown as OpsAnalysisQueueService
    const res = await postAnalysisQueueTriageStarted(svc, 'q-1', {
      'x-investigator-callback-key': 'secret-key',
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true, incidentPipelineStatus: 'in_triage' })
  })

  it('maps not_found to 404', async () => {
    process.env.OPS_METRICS_KEY = 'ops-key'
    const svc = {
      markTriageStarted: vi.fn(async () => ({ ok: false as const, error: 'not_found' as const })),
    } as unknown as OpsAnalysisQueueService
    const res = await postAnalysisQueueTriageStarted(svc, 'q-1', {
      'x-internal-ops-key': 'ops-key',
    })
    expect(res.statusCode).toBe(404)
  })
})
