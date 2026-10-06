import { afterEach, describe, expect, it, vi } from 'vitest'
import { DefectCiPollService } from '../src/application/ops/defect-ci-poll.service.js'
import { DefectCiPipelineService } from '../src/application/ops/defect-ci-pipeline.service.js'
import type { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'
import { platformDefectPipelineDefaults } from './fixtures/platform-defect-record.defaults.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'
import { resetDefectBoardBus } from '../src/infrastructure/ops/platform-defect-board.bus.js'

function defect(): PlatformDefectRecord {
  return {
    id: 'd1',
    referenceCode: 'DEF-000003',
    title: 'Poll',
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
  }
}

describe('DefectCiPollService', () => {
  afterEach(() => {
    resetDefectBoardBus()
    delete process.env.GITHUB_OPS_TOKEN
    delete process.env.GITHUB_DEFECT_CI_WEBHOOK_SECRET
  })

  it('skips reconcile when GITHUB_OPS_TOKEN missing', async () => {
    const repo = { listReadyForPrWithPrUrl: vi.fn() } as unknown as PlatformDefectPgRepository
    const svc = new DefectCiPollService(repo, new DefectCiPipelineService(repo))
    const result = await svc.reconcileReadyForPr()
    expect(result.skipped).toBe(true)
    expect(repo.listReadyForPrWithPrUrl).not.toHaveBeenCalled()
  })

  it('reconcile polls ready_for_pr defects and ingests CI payload', async () => {
    process.env.GITHUB_OPS_TOKEN = 'gh_test'
    process.env.GITHUB_DEFECT_CI_WEBHOOK_SECRET = 'secret'
    const row = defect()
    const updated = { ...row, pipelineStatus: 'ci_success' as const }
    const repo = {
      listReadyForPrWithPrUrl: vi.fn(async () => [row]),
      findActiveDefectsByPrUrls: vi.fn(async () => [row]),
      applyCiPipelineSnapshot: vi.fn(async () => updated),
      findById: vi.fn(async () => updated),
    } as unknown as PlatformDefectPgRepository
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/pulls/42')) {
        return { ok: true, status: 200, json: async () => ({ sha: 'sha1' }) }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          workflow_runs: [
            {
              status: 'completed',
              conclusion: 'success',
              html_url: 'https://github.com/RafaDru/aiyra-care/actions/runs/1',
              pull_requests: [{ html_url: row.prUrl }],
            },
          ],
        }),
      }
    }) as typeof fetch

    const svc = new DefectCiPollService(
      repo,
      new DefectCiPipelineService(repo),
      process.env,
      fetchImpl,
    )
    const result = await svc.reconcileReadyForPr(5)
    expect(result).toMatchObject({ polled: 1, updated: 1, errors: 0 })
    expect(repo.applyCiPipelineSnapshot).toHaveBeenCalled()
  })
})
