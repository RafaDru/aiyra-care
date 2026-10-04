import { describe, expect, it, vi } from 'vitest'
import { OpsAnalysisQueueService } from '../src/application/ops/ops-analysis-queue.service.js'
import { PlatformDefectTransitionError } from '../src/application/ops/platform-defect.service.js'
import type { OpsAnalysisQueueRecord } from '../src/domain/ops/ops-analysis-queue.types.js'

function queueRecord(overrides: Partial<OpsAnalysisQueueRecord> = {}): OpsAnalysisQueueRecord {
  return {
    id: 'q-1',
    sourceType: 'support_report',
    sourceId: 'rep-1',
    lane: 'development_support',
    status: 'fix_proposed',
    incidentPipelineStatus: 'in_triage',
    priority: 'normal',
    deploymentTier: 'integration',
    title: 't',
    errorSummary: null,
    contextSnapshot: {},
    remediationSummary: 'done',
    analysisArtifactPath: 'docs/x.md',
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

describe('OpsAnalysisQueueService triage callback', () => {
  it('creates defect and marks incident triaged on new_defect', async () => {
    const repo = {
      applyAgentCallback: vi.fn(async () => queueRecord()),
      setIncidentPipelineStatus: vi.fn(async () => undefined),
      markCompleted: vi.fn(async () => true),
      findById: vi.fn(async () => queueRecord({ incidentPipelineStatus: 'triaged' })),
    }
    const supportRepo = {
      updateAnalysisStateForOps: vi.fn(async () => true),
      applyAgentOpsPatch: vi.fn(async () => true),
    }
    const defects = {
      createFromTriage: vi.fn(async () => ({ id: 'def-1' })),
    }
    const svc = new OpsAnalysisQueueService(
      repo as never,
      supportRepo as never,
      undefined,
      defects as never,
    )

    await svc.completeFromAgent({
      investigationId: 'q-1',
      remediationSummary: 'Root cause in wallet sync.',
      triageDecision: 'new_defect',
      defect: { title: 'Wallet sync 500', fingerprint: 'wallet-500' },
    })

    expect(defects.createFromTriage).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Wallet sync 500', fingerprint: 'wallet-500' }),
      'q-1',
      'agent_triage',
      expect.objectContaining({ incidentSeenAt: expect.any(String) }),
    )
    expect(repo.setIncidentPipelineStatus).toHaveBeenCalledWith('q-1', 'triaged')
    expect(repo.markCompleted).toHaveBeenCalledWith('q-1')
  })

  it('dismisses incident on triageDecision dismiss', async () => {
    const repo = {
      applyAgentCallback: vi.fn(async () => queueRecord()),
      markDismissed: vi.fn(async () => undefined),
      findById: vi.fn(async () => queueRecord({ status: 'dismissed', incidentPipelineStatus: 'dismissed' })),
    }
    const svc = new OpsAnalysisQueueService(repo as never)
    await svc.completeFromAgent({
      investigationId: 'q-1',
      remediationSummary: 'Not a product defect.',
      triageDecision: 'dismiss',
    })
    expect(repo.markDismissed).toHaveBeenCalled()
  })

  it('rejects ready_for_pr defect callback without prUrl', async () => {
    const repo = {
      applyAgentCallback: vi.fn(async () => queueRecord()),
      findById: vi.fn(async () => queueRecord()),
    }
    const defects = {
      applyAgentStatusCallback: vi.fn(async () => {
        throw new PlatformDefectTransitionError('pr_url_required')
      }),
    }
    const svc = new OpsAnalysisQueueService(repo as never, undefined, undefined, defects as never)

    await expect(
      svc.processAgentCallback({
        defectId: 'def-1',
        defectStatus: 'ready_for_pr',
        remediationSummary: '[defect:abc] done',
      }),
    ).rejects.toBeInstanceOf(PlatformDefectTransitionError)

    expect(repo.applyAgentCallback).not.toHaveBeenCalled()
    expect(defects.applyAgentStatusCallback).toHaveBeenCalled()
  })

  it('applies correction_failed defect-only callback without queue record', async () => {
    const openDefect = { id: 'def-1', status: 'open' as const }
    const defects = {
      applyAgentStatusCallback: vi.fn(async () => openDefect),
    }
    const svc = new OpsAnalysisQueueService({} as never, undefined, undefined, defects as never)
    const result = await svc.processAgentCallback({
      defectId: 'def-1',
      defectStatus: 'correction_failed',
      remediationSummary: '[defect:def-1] blocked',
      failureDetails: { message: 'Scope ambiguous', code: 'blocked' },
    })
    expect(result.queue).toBeNull()
    expect(result.defect).toEqual(openDefect)
  })
})
