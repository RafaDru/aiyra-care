import { describe, expect, it, vi, afterEach } from 'vitest'
import { DefectCiPipelineService } from '../src/application/ops/defect-ci-pipeline.service.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'
import type { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'
import { platformDefectPipelineDefaults } from './fixtures/platform-defect-record.defaults.js'
import { resetDefectBoardBus } from '../src/infrastructure/ops/platform-defect-board.bus.js'

function defect(overrides: Partial<PlatformDefectRecord> = {}): PlatformDefectRecord {
  return {
    id: 'd1',
    referenceCode: 'DEF-000003',
    title: 'CI test',
    status: 'ready_for_pr',
    fingerprint: null,
    impact: null,
    applications: [],
    ownerSubject: null,
    triageSummary: null,
    triageArtifactPath: null,
    branchName: 'cursor/fix',
    prUrl: 'https://github.com/RafaDru/aiyra-care/pull/42',
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
    ...overrides,
  }
}

const workflowFailurePayload = {
  repository: { full_name: 'RafaDru/aiyra-care' },
  workflow_run: {
    status: 'completed',
    conclusion: 'failure',
    html_url: 'https://github.com/RafaDru/aiyra-care/actions/runs/100',
    head_branch: 'api',
    pull_requests: [{ html_url: 'https://github.com/RafaDru/aiyra-care/pull/42' }],
  },
}

describe('DefectCiPipelineService', () => {
  afterEach(() => {
    resetDefectBoardBus()
    delete process.env.GITHUB_DEFECT_CI_WEBHOOK_SECRET
    delete process.env.CH_DEFECT_CI_WEBHOOK_ENABLED
    delete process.env.CH_DEFECT_CI_AUTO_REOPEN_ON_FAIL
  })

  it('returns disabled when webhook not configured', async () => {
    const repo = {} as PlatformDefectPgRepository
    const svc = new DefectCiPipelineService(repo)
    const result = await svc.handleGithubEvent(workflowFailurePayload)
    expect(result).toEqual({ outcome: 'disabled', reason: 'webhook_disabled' })
  })

  it('reopens defect on CI failure when auto reopen enabled', async () => {
    process.env.GITHUB_DEFECT_CI_WEBHOOK_SECRET = 'secret'
    process.env.CH_DEFECT_CI_AUTO_REOPEN_ON_FAIL = '1'
    const reopened = defect({
      status: 'in_fix',
      pipelineStatus: 'ci_failed',
      lastFailureKind: 'ci',
      lastCiRunUrl: 'https://github.com/RafaDru/aiyra-care/actions/runs/100',
    })
    const repo = {
      findActiveDefectsByPrUrls: vi.fn(async () => [defect()]),
      applyCiFailureReopen: vi.fn(async () => reopened),
      applyCiPipelineSnapshot: vi.fn(),
    } as unknown as PlatformDefectPgRepository
    const svc = new DefectCiPipelineService(repo)
    const result = await svc.handleGithubEvent(workflowFailurePayload)
    expect(result.outcome).toBe('updated')
    if (result.outcome === 'updated') {
      expect(result.reopenedDefectIds).toEqual(['d1'])
      expect(result.defects[0].status).toBe('in_fix')
    }
    expect(repo.applyCiFailureReopen).toHaveBeenCalledOnce()
  })

  it('updates pipeline snapshot without reopen when auto reopen off', async () => {
    process.env.GITHUB_DEFECT_CI_WEBHOOK_SECRET = 'secret'
    const updated = defect({ pipelineStatus: 'ci_failed', lastFailureKind: 'ci' })
    const repo = {
      findActiveDefectsByPrUrls: vi.fn(async () => [defect()]),
      applyCiFailureReopen: vi.fn(),
      applyCiPipelineSnapshot: vi.fn(async () => updated),
    } as unknown as PlatformDefectPgRepository
    const svc = new DefectCiPipelineService(repo)
    const result = await svc.handleGithubEvent(workflowFailurePayload)
    expect(result.outcome).toBe('updated')
    expect(repo.applyCiFailureReopen).not.toHaveBeenCalled()
    expect(repo.applyCiPipelineSnapshot).toHaveBeenCalledOnce()
  })
})
