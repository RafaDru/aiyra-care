import { describe, expect, it } from 'vitest'
import {
  buildDefectCiSnapshotPayload,
  deriveDefectCiStatusSnapshot,
  extractCiStatusLabelFromSnapshot,
  mergeReviewCiSnapshot,
} from '../src/domain/ops/defect-ci-status.helper.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'
import { platformDefectPipelineDefaults } from './fixtures/platform-defect-record.defaults.js'

function baseDefect(overrides: Partial<PlatformDefectRecord> = {}): PlatformDefectRecord {
  return {
    id: '0e672818-72ec-4ef7-918e-312db34bbeb5',
    referenceCode: 'DEF-000001',
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
    firstSeenAt: '2026-10-01T00:00:00.000Z',
    fixStartedAt: null,
    lastFixDispatchSentAt: null,
    readyForPrAt: null,
    fixedAt: null,
    lastFailureKind: null,
    lastFailureSummary: null,
    lastCorrectionFailureDetails: null,
    correctionFailedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...platformDefectPipelineDefaults,
    ...overrides,
  }
}

describe('defect-ci-status.helper', () => {
  it('maps ci_success to CI: verde', () => {
    const snap = deriveDefectCiStatusSnapshot(
      baseDefect({
        pipelineStatus: 'ci_success',
        lastCiRunUrl: 'https://github.com/actions/runs/1',
      }),
    )
    expect(snap.kind).toBe('green')
    expect(snap.label).toBe('CI: verde')
    expect(snap.status).toBe('success')
    expect(snap.runUrl).toContain('actions/runs')
  })

  it('maps ci_failed with failed jobs', () => {
    const snap = deriveDefectCiStatusSnapshot(
      baseDefect({
        pipelineStatus: 'ci_failed',
        lastFailureKind: 'ci',
        lastFailureDetails: { failedJobs: ['test', 'build'] },
      }),
    )
    expect(snap.kind).toBe('failed')
    expect(snap.label).toBe('CI: falhou')
    expect(snap.failedJobs).toEqual(['test', 'build'])
  })

  it('maps ci_running to CI: pendente', () => {
    const snap = deriveDefectCiStatusSnapshot(baseDefect({ pipelineStatus: 'ci_running' }))
    expect(snap.kind).toBe('pending')
    expect(snap.label).toBe('CI: pendente')
  })

  it('buildDefectCiSnapshotPayload includes ciStatus block', () => {
    const payload = buildDefectCiSnapshotPayload(baseDefect({ pipelineStatus: 'ci_pending' }))
    expect(payload.status).toBe('pending')
    expect(payload.ciStatus).toEqual({ kind: 'pending', label: 'CI: pendente' })
    expect(payload.source).toBe('defect_pipeline')
  })

  it('mergeReviewCiSnapshot prefers agent success but keeps defect runUrl', () => {
    const merged = mergeReviewCiSnapshot(
      baseDefect({
        pipelineStatus: 'ci_running',
        lastCiRunUrl: 'https://github.com/actions/runs/99',
      }),
      { status: 'success', conclusion: 'success' },
    )
    expect(merged.status).toBe('success')
    expect(merged.ciStatus).toEqual({ kind: 'green', label: 'CI: verde' })
    expect(merged.runUrl).toBe('https://github.com/actions/runs/99')
    expect(merged.source).toBe('merged_agent_defect')
  })

  it('extractCiStatusLabelFromSnapshot reads nested label', () => {
    expect(
      extractCiStatusLabelFromSnapshot({
        ciStatus: { kind: 'failed', label: 'CI: falhou' },
      }),
    ).toBe('CI: falhou')
    expect(extractCiStatusLabelFromSnapshot({ status: 'success' })).toBe('CI: verde')
  })
})
