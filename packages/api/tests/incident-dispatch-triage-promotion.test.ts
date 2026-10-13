import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { OpsAnalysisQueueRecord } from '../src/domain/ops/ops-analysis-queue.types.js'
import { IncidentDispatchService } from '../src/application/ops/incident-dispatch.service.js'
import type { IncidentDispatchOutboxPgRepository } from '../src/infrastructure/persistence/incident-dispatch-outbox.pg.repository.js'
import type { OpsAnalysisQueuePgRepository } from '../src/infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import type { SupportReportPgRepository } from '../src/infrastructure/persistence/support-report.pg.repository.js'

vi.mock('../src/application/support-report/support-report-dispatch.js', () => ({
  dispatchSupportReportInvestigator: vi.fn(async () => ({ outcome: 'sent' as const })),
}))

function queueRow(overrides: Partial<OpsAnalysisQueueRecord> = {}): OpsAnalysisQueueRecord {
  return {
    id: 'inc-1',
    sourceType: 'support_report',
    sourceId: 'sr-1',
    lane: 'development_support',
    status: 'queued',
    incidentPipelineStatus: 'queued_worker',
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

describe('IncidentDispatchService successful dispatch → in_triage', () => {
  let pipelineStatus: OpsAnalysisQueueRecord['incidentPipelineStatus']
  let queueRepo: OpsAnalysisQueuePgRepository
  let markForwarded: ReturnType<typeof vi.fn>
  let service: IncidentDispatchService

  beforeEach(() => {
    pipelineStatus = 'queued_worker'
    markForwarded = vi.fn(async () => undefined)
    queueRepo = {
      findById: vi.fn(async (id: string) =>
        id === 'inc-1' ? queueRow({ incidentPipelineStatus: pipelineStatus }) : null,
      ),
      setIncidentPipelineStatus: vi.fn(async (_id: string, status) => {
        pipelineStatus = status
      }),
      markPipelineInTriage: vi.fn(async () => {
        pipelineStatus = 'in_triage'
      }),
      markInvestigating: vi.fn(async () => undefined),
    } as unknown as OpsAnalysisQueuePgRepository

    const outbox: IncidentDispatchOutboxPgRepository = {
      listPending: vi.fn(async () => [
        {
          id: 'o1',
          incidentId: 'inc-1',
          idempotencyKey: 'inc-1:triage_v1',
          payload: {
            kind: 'support_report_triage_v1',
            sourceId: 'sr-1',
            trigger: 'auto',
            callbackUrl: 'http://127.0.0.1:3013/callback',
            triageStartedUrl: 'http://127.0.0.1:3013/triage-started',
          },
          status: 'pending',
          attemptCount: 0,
          lastError: null,
          forwardedAt: null,
          claimedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
      claim: vi.fn(async () => true),
      markForwarded,
      bumpAttempt: vi.fn(),
      markDead: vi.fn(),
    } as unknown as IncidentDispatchOutboxPgRepository

    const supportRepo = {
      findByIdForOps: vi.fn(async () => ({
        id: 'sr-1',
        category: 'technical_bug',
        description: 'x',
        route: '/x',
        consentTechnical: true,
        diagnosticContext: { recentClientErrors: [] },
      })),
    } as unknown as SupportReportPgRepository

    service = new IncidentDispatchService(outbox, queueRepo, supportRepo)
  })

  it('processOutboxBatch promotes forwarded webhook to in_triage', async () => {
    const result = await service.processOutboxBatch(1)
    expect(result).toEqual({ processed: 1, sent: 1, failed: 0, dead: 0, skipped: 0 })
    expect(markForwarded).toHaveBeenCalledWith('o1')
    expect(queueRepo.markPipelineInTriage).toHaveBeenCalledWith('inc-1')
    expect(queueRepo.markInvestigating).toHaveBeenCalledWith('inc-1')
    expect(pipelineStatus).toBe('in_triage')
  })
})
