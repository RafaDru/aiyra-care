import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { OpsAnalysisQueueRecord } from '../src/domain/ops/ops-analysis-queue.types.js'
import type { SupportReportRecord } from '../src/domain/support-report/support-report.types.js'
import { IncidentDispatchService } from '../src/application/ops/incident-dispatch.service.js'
import type { IncidentDispatchOutboxPgRepository } from '../src/infrastructure/persistence/incident-dispatch-outbox.pg.repository.js'
import type { OpsAnalysisQueuePgRepository } from '../src/infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import type { SupportReportPgRepository } from '../src/infrastructure/persistence/support-report.pg.repository.js'

function queueRow(overrides: Partial<OpsAnalysisQueueRecord> = {}): OpsAnalysisQueueRecord {
  return {
    id: 'inc-1',
    sourceType: 'support_report',
    sourceId: 'sr-1',
    lane: 'development_support',
    status: 'queued',
    incidentPipelineStatus: 'open',
    priority: 'normal',
    deploymentTier: 'local',
    title: '[technical_bug] /x',
    errorSummary: null,
    contextSnapshot: { category: 'technical_bug' },
    remediationSummary: null,
    analysisArtifactPath: null,
    prUrl: null,
    analysisLastError: null,
    operatorNotes: null,
    investigationTrigger: 'auto',
    queuedAt: '2026-09-25T10:00:00.000Z',
    investigationRequestedAt: null,
    completedAt: null,
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-25T10:00:00.000Z',
    ...overrides,
  }
}

const minimalSupport = {
  id: 'sr-1',
  accountId: 'acc',
  status: 'open',
  category: 'technical_bug',
  description: 'bug',
  route: '/x',
  consentTechnical: true,
  diagnosticContext: { recentClientErrors: [] },
  appVersion: '1',
  operatorNotes: null,
  deploymentStatus: 'none',
  deploymentActions: [],
} as SupportReportRecord

describe('IncidentDispatchService reconcile', () => {
  let outbox: IncidentDispatchOutboxPgRepository
  let queueRepo: OpsAnalysisQueuePgRepository
  let supportRepo: SupportReportPgRepository
  let service: IncidentDispatchService
  const outboxByKey = new Map<string, { id: string; status: string; attemptCount: number }>()

  beforeEach(() => {
    outboxByKey.clear()
    outbox = {
      insertIfAbsent: vi.fn(async (input) => {
        if (outboxByKey.has(input.idempotencyKey)) return null
        outboxByKey.set(input.idempotencyKey, {
          id: 'o1',
          status: 'pending',
          attemptCount: 0,
        })
        return {
          id: 'o1',
          incidentId: input.incidentId,
          idempotencyKey: input.idempotencyKey,
          payload: input.payload,
          status: 'pending',
          attemptCount: 0,
          lastError: null,
          forwardedAt: null,
          claimedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }),
      findByIdempotencyKey: vi.fn(async (key) => {
        const row = outboxByKey.get(key)
        if (!row) return null
        return {
          id: row.id,
          incidentId: 'inc-1',
          idempotencyKey: key,
          payload: {},
          status: row.status as 'pending',
          attemptCount: row.attemptCount,
          lastError: null,
          forwardedAt: null,
          claimedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }),
      resetToPending: vi.fn(async (id, _payload) => {
        const entry = [...outboxByKey.values()].find((r) => r.id === id)
        if (entry) entry.status = 'pending'
      }),
      listPending: vi.fn(async () => []),
      claim: vi.fn(),
      markForwarded: vi.fn(),
      bumpAttempt: vi.fn(),
      markDead: vi.fn(),
      hasActiveDispatchForIncident: vi.fn(),
    } as unknown as IncidentDispatchOutboxPgRepository

    queueRepo = {
      listOpenNeedingDispatchOutbox: vi.fn(async () => [queueRow()]),
      findById: vi.fn(async (id: string) => (id === 'inc-1' ? queueRow() : null)),
      setIncidentPipelineStatus: vi.fn(),
      markInvestigating: vi.fn(),
    } as unknown as OpsAnalysisQueuePgRepository

    supportRepo = {
      findByIdForOps: vi.fn(async (id) => (id === 'sr-1' ? minimalSupport : null)),
    } as unknown as SupportReportPgRepository

    service = new IncidentDispatchService(outbox, queueRepo, supportRepo)
  })

  it('ensureOutboxForQueueRecord inserts once and is idempotent on second call', async () => {
    const row = queueRow()
    expect(await service.ensureOutboxForQueueRecord(row)).toBe('inserted')
    expect(await service.ensureOutboxForQueueRecord(row)).toBe('exists')
    expect(outbox.insertIfAbsent).toHaveBeenCalledTimes(1)
  })

  it('reconcileOpenIncidents enqueues eligible open incidents', async () => {
    const result = await service.reconcileOpenIncidents(10, { staleOnly: false })
    expect(result).toEqual({ scanned: 1, enqueued: 1, reset: 0, skipped: 0 })
  })

  it('skips triaged pipeline and dismissed legacy status', async () => {
    expect(await service.ensureOutboxForQueueRecord(queueRow({ incidentPipelineStatus: 'triaged' }))).toBe(
      'skipped',
    )
    expect(await service.ensureOutboxForQueueRecord(queueRow({ status: 'dismissed' }))).toBe('skipped')
  })

  it('resets failed outbox row instead of duplicate insert', async () => {
    outboxByKey.set('inc-1:triage_v1', { id: 'o-old', status: 'failed', attemptCount: 2 })
    const outcome = await service.ensureOutboxForQueueRecord(queueRow())
    expect(outcome).toBe('reset')
    expect(outbox.resetToPending).toHaveBeenCalled()
  })

  it('resets dead outbox row when incident still eligible (not terminal_dead)', async () => {
    outboxByKey.set('inc-1:triage_v1', { id: 'o-dead', status: 'dead', attemptCount: 8 })
    const outcome = await service.ensureOutboxForQueueRecord(queueRow())
    expect(outcome).toBe('reset')
    expect(outbox.resetToPending).toHaveBeenCalled()
  })

  it('resetEligibleDeadOutbox revives dead rows stuck in queued_worker', async () => {
    const deadRow = {
      id: 'o-dead',
      incidentId: 'inc-1',
      idempotencyKey: 'inc-1:triage_v1',
      payload: { stale: true },
      status: 'dead' as const,
      attemptCount: 8,
      lastError: 'max_attempts',
      forwardedAt: null,
      claimedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    outbox.listDeadForEligibleIncidents = vi.fn(async () => [deadRow])
    queueRepo.findById = vi.fn(async () => queueRow({ incidentPipelineStatus: 'queued_worker' }))
    queueRepo.setIncidentPipelineStatus = vi.fn(async () => undefined)

    const result = await service.resetEligibleDeadOutbox(10)
    expect(result.reset).toBe(1)
    expect(outbox.resetToPending).toHaveBeenCalled()
    expect(queueRepo.setIncidentPipelineStatus).toHaveBeenCalledWith('inc-1', 'open')
  })

  it('resetEligibleDeadOutbox revives dead rows with fresh payload', async () => {
    const deadRow = {
      id: 'o-dead',
      incidentId: 'inc-1',
      idempotencyKey: 'inc-1:triage_v1',
      payload: { stale: true },
      status: 'dead' as const,
      attemptCount: 8,
      lastError: 'HTTP 401',
      forwardedAt: null,
      claimedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    outbox.listDeadForEligibleIncidents = vi.fn(async () => [deadRow])
    queueRepo.findById = vi.fn(async () => queueRow())

    const result = await service.resetEligibleDeadOutbox(10)
    expect(result.reset).toBe(1)
    expect(outbox.resetToPending).toHaveBeenCalledWith('o-dead', expect.objectContaining({ kind: expect.any(String) }))
  })

  it('resetEligibleDeadOutbox normalizes dispatch_failed to open', async () => {
    const deadRow = {
      id: 'o-dead',
      incidentId: 'inc-1',
      idempotencyKey: 'inc-1:triage_v1',
      payload: {},
      status: 'dead' as const,
      attemptCount: 8,
      lastError: 'max_attempts',
      forwardedAt: null,
      claimedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    outbox.listDeadForEligibleIncidents = vi.fn(async () => [deadRow])
    queueRepo.findById = vi.fn(async () => queueRow({ incidentPipelineStatus: 'dispatch_failed' }))

    await service.resetEligibleDeadOutbox(10)
    expect(queueRepo.setIncidentPipelineStatus).toHaveBeenCalledWith('inc-1', 'open')
  })

  it('retryDispatchForIncident resets dead outbox and sets pipeline open', async () => {
    outboxByKey.set('inc-1:triage_v1', { id: 'o-dead', status: 'dead', attemptCount: 8 })
    queueRepo.findById = vi.fn(async () => queueRow({ incidentPipelineStatus: 'dispatch_failed' }))

    const result = await service.retryDispatchForIncident('inc-1')
    expect(result).toEqual({ ok: true })
    expect(outbox.resetToPending).toHaveBeenCalled()
    expect(queueRepo.setIncidentPipelineStatus).toHaveBeenCalledWith('inc-1', 'open')
  })

  it('retryDispatchForIncident rejects triaged incidents', async () => {
    queueRepo.findById = vi.fn(async () =>
      queueRow({ incidentPipelineStatus: 'dispatch_failed', status: 'dismissed' }),
    )
    const result = await service.retryDispatchForIncident('inc-1')
    expect(result).toEqual({ ok: false, error: 'not_eligible' })
  })
})
