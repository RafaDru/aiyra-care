import { describe, expect, it, vi } from 'vitest'
import { OpsAnalysisQueueService } from '../src/application/ops/ops-analysis-queue.service.js'
import type { SupportReportRecord } from '../src/domain/support-report/support-report.types.js'

const supportRecord: SupportReportRecord = {
  id: 'rep-1',
  accountId: 'acc-1',
  status: 'open',
  category: 'technical_bug',
  description: 'tela branca',
  route: '/patients/x',
  sessionId: null,
  patientId: null,
  consentTechnical: true,
  consentScreenshot: false,
  consentProfileAccess: false,
  profileAccessUntil: null,
  diagnosticContext: { client: { platform: 'ios' } },
  hasScreenshot: false,
  appVersion: '1.0.0',
  userAgent: 'iPhone',
  expiresAt: new Date(),
  resolvedAt: null,
  analysisStatus: 'none',
  operatorNotes: null,
  analysisSummary: null,
  analysisArtifactPath: null,
  analysisRequestedAt: null,
  analysisCompletedAt: null,
  analysisLastError: null,
  suggestedCategory: null,
  categoryReviewNote: null,
  taxonomyGapProposal: null,
  deploymentStatus: 'none',
  deploymentActions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('OpsAnalysisQueueService.enqueueSupportReport', () => {
  it('marca origem Usuário e aplicação no contextSnapshot', async () => {
    const upsertQueued = vi.fn(async (input: Record<string, unknown>) => ({
      id: 'queue-1',
      ...input,
      status: 'queued',
      queuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    const svc = new OpsAnalysisQueueService({ upsertQueued } as never)
    await svc.enqueueSupportReport(supportRecord, { trigger: 'auto' })
    const snap = upsertQueued.mock.calls[0][0].contextSnapshot as Record<string, unknown>
    expect(snap.incidentOrigin).toBe('usuario')
    expect(snap.application).toBe('iOS')
  })
})
