import { describe, expect, it, vi } from 'vitest'
import { OpsAnalysisQueueService } from '../src/application/ops/ops-analysis-queue.service.js'
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

    expect(defects.createFromTriage).toHaveBeenCalled()
    expect(repo.setIncidentPipelineStatus).toHaveBeenCalledWith('q-1', 'triaged')
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
})
