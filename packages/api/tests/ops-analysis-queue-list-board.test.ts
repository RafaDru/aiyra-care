import { describe, expect, it, vi } from 'vitest'
import { OpsAnalysisQueueService } from '../src/application/ops/ops-analysis-queue.service.js'

const baseRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  recurrenceOfIncidentId: null,
  recurrenceOfReferenceCode: null,
  recurrenceKind: null,
  sourceType: 'support_report' as const,
  sourceId: 'rep-1',
  lane: 'development_support' as const,
  status: 'investigating' as const,
  incidentPipelineStatus: 'triaged' as const,
  priority: 'normal' as const,
  deploymentTier: 'integration',
  title: 't',
  errorSummary: null,
  contextSnapshot: {},
  remediationSummary: null,
  analysisArtifactPath: null,
  prUrl: null,
  analysisLastError: null,
  operatorNotes: null,
  investigationTrigger: 'auto' as const,
  queuedAt: new Date().toISOString(),
  investigationRequestedAt: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  referenceCode: 'INC-000002',
}

describe('OpsAnalysisQueueService.listForIncidentBoard', () => {
  it('prepends ensureId when missing from filtered list', async () => {
    const repo = {
      listForIncidentBoard: vi.fn(async () => []),
      findById: vi.fn(async () => baseRecord),
    }
    const svc = new OpsAnalysisQueueService(repo as never, {} as never)
    const items = await svc.listForIncidentBoard('needs_attention', {
      ensureId: baseRecord.id,
    })
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(baseRecord.id)
    expect(repo.findById).toHaveBeenCalledWith(baseRecord.id)
  })
})
