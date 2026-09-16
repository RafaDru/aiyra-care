import { describe, expect, it, vi } from 'vitest'
import { OpsAnalysisQueueService } from '../src/application/ops/ops-analysis-queue.service.js'

describe('OpsAnalysisQueueService', () => {
  it('completeFromAgent applies fix_proposed via repository', async () => {
    const repo = {
      applyAgentCallback: vi.fn(async () => ({
        id: 'q-1',
        sourceType: 'support_report',
        sourceId: 'rep-1',
        lane: 'development_support',
        status: 'fix_proposed',
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
      })),
    }
    const supportRepo = {
      updateAnalysisStateForOps: vi.fn(async () => true),
    }
    const svc = new OpsAnalysisQueueService(repo as never, supportRepo as never)
    const result = await svc.completeFromAgent({
      queueId: 'q-1',
      remediationSummary: 'Hipótese principal validada no código.',
      analysisArtifactPath: 'docs/x.md',
    })
    expect(result?.status).toBe('fix_proposed')
    expect(repo.applyAgentCallback).toHaveBeenCalled()
    expect(supportRepo.updateAnalysisStateForOps).toHaveBeenCalled()
  })
})
