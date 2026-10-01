import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupportReportRecord } from '../src/domain/support-report/support-report.types.js'
import { groupSupportReportsForBatch } from '../src/application/support-report/support-report-batch.js'

function record(id: string, category: SupportReportRecord['category']): SupportReportRecord {
  const now = new Date('2026-09-18T12:00:00Z')
  return {
    id,
    accountId: 'acc-1',
    status: 'open',
    category,
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
    expiresAt: now,
    resolvedAt: null,
    analysisStatus: 'queued',
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
    createdAt: now,
    updatedAt: now,
  }
}

describe('support-report-batch', () => {
  afterEach(() => {
    delete process.env.OPS_SUPPORT_INVESTIGATOR_MODE
    vi.unstubAllGlobals()
  })

  it('groups queued reports by deployment tier and category', () => {
    const groups = groupSupportReportsForBatch(
      [
        record('a', 'technical_bug'),
        record('b', 'technical_bug'),
        record('c', 'ux_confusion'),
      ],
      'preview',
    )
    expect(groups.size).toBe(2)
    const bugKey = 'preview\0technical_bug'
    const uxKey = 'preview\0ux_confusion'
    expect(groups.get(bugKey)?.map((r) => r.id)).toEqual(['a', 'b'])
    expect(groups.get(uxKey)?.map((r) => r.id)).toEqual(['c'])
  })

  it('builds batch investigator payload shape', async () => {
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/cursor-automation'
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY = 'crsr_test_key'
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { dispatchSupportReportBatchInvestigator } = await import(
      '../src/application/support-report/support-report-dispatch.js'
    )
    const result = await dispatchSupportReportBatchInvestigator({
      category: 'technical_bug',
      deploymentTier: 'integration',
      records: [
        {
          reportId: 'rep-1',
          route: '/patients/1',
          descriptionExcerpt: null,
          diagnosticSummary: 'fp-abc',
        },
      ],
      investigationTier: 0,
      analysisQueue: { id: 'queue-uuid', callbackUrl: 'http://127.0.0.1:3013/api/analysis-queue/callback' },
    })
    expect(result).toEqual({ outcome: 'sent' })
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.type).toBe('support_report_batch')
    expect(body.category).toBe('technical_bug')
    expect(body.investigation).toEqual({
      tier: 0,
      playbook: 'support-report-tier0',
      trigger: 'scheduled',
    })
    expect(body.reports).toHaveLength(1)
    expect(body.analysisQueue.id).toBe('queue-uuid')
  })

  it('resolveSupportInvestigatorMode defaults to immediate', async () => {
    const { resolveSupportInvestigatorMode, isSupportInvestigatorBatchMode } = await import(
      '../src/domain/ops/support-investigator-mode.js'
    )
    expect(resolveSupportInvestigatorMode()).toBe('immediate')
    expect(isSupportInvestigatorBatchMode()).toBe(false)
    process.env.OPS_SUPPORT_INVESTIGATOR_MODE = 'batch'
    expect(isSupportInvestigatorBatchMode()).toBe(true)
  })
})
