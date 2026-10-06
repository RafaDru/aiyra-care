import { describe, expect, it } from 'vitest'
import {
  buildDefectCycleSteps,
  buildIncidentCycleSteps,
  defectPipelineCiRowBadge,
  defectShowCiFailureBanner,
  extractCiFailedJobs,
  formatCiFailureSummary,
} from '../../ops-console/src/client/ch-pipeline-display.js'
import type { PlatformDefectItem } from '../../ops-console/src/client/ops.types.js'
import type { OpsAnalysisQueueItem } from '../../ops-console/src/client/ops.types.js'

function defect(partial: Partial<PlatformDefectItem> = {}): PlatformDefectItem {
  return {
    id: 'd1',
    referenceCode: 'DEF-000003',
    title: 'Test',
    status: 'ready_for_pr',
    fingerprint: null,
    impact: null,
    applications: [],
    ownerSubject: null,
    triageSummary: null,
    triageArtifactPath: null,
    branchName: 'cursor/fix',
    prUrl: 'https://github.com/RafaDru/aiyra-care/pull/1',
    mergedPrUrl: null,
    mergedAt: null,
    fixedVia: null,
    prBatchId: null,
    firstSeenAt: '2026-10-01T10:00:00.000Z',
    fixStartedAt: '2026-10-01T11:00:00.000Z',
    lastFixDispatchSentAt: null,
    readyForPrAt: '2026-10-01T12:00:00.000Z',
    fixedAt: null,
    lastFailureKind: null,
    lastFailureSummary: null,
    lastCorrectionFailureDetails: null,
    correctionFailedAt: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    pipelineStatus: 'ci_success',
    ...partial,
  }
}

describe('ch-pipeline-display', () => {
  it('CI row badge shows success on ci_success', () => {
    const badge = defectPipelineCiRowBadge(defect({ pipelineStatus: 'ci_success' }))
    expect(badge).toEqual({ label: 'CI ✓', color: 'success' })
  })

  it('CI failure banner for in_fix after ci fail', () => {
    const item = defect({
      status: 'in_fix',
      lastFailureKind: 'ci',
      lastFailureDetails: { failedJobs: ['api', 'web'] },
      lastFailureSummary: 'workflow failed',
    })
    expect(defectShowCiFailureBanner(item)).toBe(true)
    expect(extractCiFailedJobs(item)).toEqual(['api', 'web'])
    expect(formatCiFailureSummary(item)).toBe('workflow failed')
  })

  it('buildDefectCycleSteps includes merge step pending before fixed', () => {
    const steps = buildDefectCycleSteps(defect())
    expect(steps.map((s) => s.key)).toEqual([
      'detected',
      'in_fix',
      'ready_for_pr',
      'ci',
      'review',
      'merge',
    ])
    const merge = steps.find((s) => s.key === 'merge')
    expect(merge?.state).toBe('pending')
  })

  it('buildIncidentCycleSteps marks resolved', () => {
    const row = {
      id: 'i1',
      incidentPipelineStatus: 'resolved',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
      completedAt: '2026-10-02T10:00:00.000Z',
      linkedDefects: [{ id: 'd1', referenceCode: 'DEF-1', status: 'fixed' }],
    } as OpsAnalysisQueueItem
    const steps = buildIncidentCycleSteps(row)
    expect(steps.find((s) => s.key === 'resolved')?.state).toBe('done')
  })
})
