import { describe, expect, it, vi } from 'vitest'
import {
  defectInFixWithoutDispatch,
  reconcileUntruthfulDefectInFix,
} from '../src/application/ops/platform-defect-in-fix-reconcile.js'
import { PlatformDefectService } from '../src/application/ops/platform-defect.service.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'

function row(overrides: Partial<PlatformDefectRecord> = {}): PlatformDefectRecord {
  return {
    id: 'd1',
    referenceCode: 'DEF-000001',
    title: 'Bug',
    status: 'in_fix',
    fingerprint: null,
    impact: null,
    applications: [],
    ownerSubject: null,
    triageSummary: null,
    triageArtifactPath: null,
    branchName: null,
    prUrl: null,
    mergedPrUrl: null,
    mergedAt: null,
    fixedVia: null,
    prBatchId: null,
    firstSeenAt: new Date().toISOString(),
    fixStartedAt: new Date().toISOString(),
    lastFixDispatchSentAt: null,
    readyForPrAt: null,
    fixedAt: null,
    lastFailureKind: null,
    lastFailureSummary: null,
    lastCorrectionFailureDetails: null,
    correctionFailedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('platform-defect-in-fix-reconcile', () => {
  it('detects in_fix without dispatch timestamp', () => {
    expect(defectInFixWithoutDispatch(row())).toBe(true)
    expect(defectInFixWithoutDispatch(row({ lastFixDispatchSentAt: new Date().toISOString() }))).toBe(
      false,
    )
    expect(defectInFixWithoutDispatch(row({ status: 'open' }))).toBe(false)
  })

  it('reverts stale in_fix via service', async () => {
    const open = row({ status: 'open', fixStartedAt: null, lastFixDispatchSentAt: null })
    const revertStaleInFix = vi.fn(async () => open)
    const service = { revertStaleInFix } as unknown as PlatformDefectService

    const result = await reconcileUntruthfulDefectInFix(service, row())
    expect(revertStaleInFix).toHaveBeenCalledWith('d1')
    expect(result.status).toBe('open')
  })
})
