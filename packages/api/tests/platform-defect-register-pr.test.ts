import { describe, expect, it, vi } from 'vitest'
import { PlatformDefectService } from '../src/application/ops/platform-defect.service.js'
import type { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'
import { platformDefectPipelineDefaults } from './fixtures/platform-defect-record.defaults.js'

describe('PlatformDefectService.registerPrUrl', () => {
  it('updates pr url for ready_for_pr defect', async () => {
    const existing = {
      id: 'd1',
      status: 'ready_for_pr' as const,
      prUrl: null,
      referenceCode: 'DEF-1',
      title: 'x',
      fingerprint: null,
      impact: null,
      applications: [],
      ownerSubject: null,
      triageSummary: null,
      triageArtifactPath: null,
      branchName: null,
      mergedPrUrl: null,
      mergedAt: null,
      fixedVia: null,
      prBatchId: null,
      firstSeenAt: new Date().toISOString(),
      fixStartedAt: null,
      lastFixDispatchSentAt: null,
      readyForPrAt: new Date().toISOString(),
      fixedAt: null,
      lastFailureKind: null,
      lastFailureSummary: null,
      lastCorrectionFailureDetails: null,
      correctionFailedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...platformDefectPipelineDefaults,
    }
    const updated = { ...existing, prUrl: 'https://github.com/RafaDru/aiyra-care/pull/9' }
    const repo = {
      findById: vi.fn(async () => existing),
      updatePrUrl: vi.fn(async () => updated),
      getDbPool: vi.fn(),
    } as unknown as PlatformDefectPgRepository
    const service = new PlatformDefectService(repo)
    const result = await service.registerPrUrl(
      'd1',
      'https://github.com/RafaDru/aiyra-care/pull/9',
    )
    expect(result.prUrl).toContain('/pull/9')
    expect(repo.updatePrUrl).toHaveBeenCalled()
  })
})
