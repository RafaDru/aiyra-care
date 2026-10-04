import { describe, expect, it, vi } from 'vitest'
import { PlatformDefectMergeWebhookService } from '../src/application/ops/platform-defect-merge-webhook.service.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'
import type { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'

function defect(overrides: Partial<PlatformDefectRecord> = {}): PlatformDefectRecord {
  return {
    id: 'd1',
    referenceCode: 'DEF-000001',
    title: 'Bug',
    status: 'ready_for_pr',
    fingerprint: null,
    impact: null,
    applications: [],
    ownerSubject: null,
    triageSummary: null,
    triageArtifactPath: null,
    branchName: 'cursor/fix',
    prUrl: 'https://github.com/RafaDru/aiyra-care/pull/99',
    mergedPrUrl: null,
    mergedAt: null,
    fixedVia: null,
    prBatchId: null,
    firstSeenAt: new Date().toISOString(),
    fixStartedAt: null,
    lastFixDispatchSentAt: null,
    readyForPrAt: new Date().toISOString(),
    fixedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

const payload = {
  action: 'closed',
  pull_request: {
    merged: true,
    html_url: 'https://github.com/RafaDru/aiyra-care/pull/99',
    body: 'DEF-000001',
    base: { ref: 'main' },
  },
}

describe('PlatformDefectMergeWebhookService', () => {
  it('marks defect fixed from merged PR', async () => {
    process.env.GITHUB_DEFECT_MERGE_WEBHOOK_SECRET = 'secret'
    const fixed = defect({
      status: 'fixed',
      fixedVia: 'github_webhook',
      mergedPrUrl: 'https://github.com/RafaDru/aiyra-care/pull/99',
      fixedAt: new Date().toISOString(),
    })
    const repo = {
      findMergeCandidates: vi.fn(async () => [defect()]),
      applyGithubMergeFixed: vi.fn(async () => ({ record: fixed, wasAlreadyFixed: false })),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectMergeWebhookService(repo)
    const result = await svc.handlePullRequestClosed(payload)
    expect(result.outcome).toBe('fixed')
    if (result.outcome === 'fixed') {
      expect(result.idempotent).toBe(false)
      expect(result.defects[0].status).toBe('fixed')
    }
    delete process.env.GITHUB_DEFECT_MERGE_WEBHOOK_SECRET
  })

  it('is idempotent when already fixed', async () => {
    process.env.GITHUB_DEFECT_MERGE_WEBHOOK_SECRET = 'secret'
    const fixed = defect({
      status: 'fixed',
      fixedVia: 'github_webhook',
      mergedPrUrl: 'https://github.com/RafaDru/aiyra-care/pull/99',
    })
    const repo = {
      findMergeCandidates: vi.fn(async () => [fixed]),
      applyGithubMergeFixed: vi.fn(async () => ({ record: fixed, wasAlreadyFixed: true })),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectMergeWebhookService(repo)
    const result = await svc.handlePullRequestClosed(payload)
    expect(result).toMatchObject({ outcome: 'fixed', idempotent: true })
    delete process.env.GITHUB_DEFECT_MERGE_WEBHOOK_SECRET
  })

  it('ignores wrong base ref', async () => {
    process.env.GITHUB_DEFECT_MERGE_WEBHOOK_SECRET = 'secret'
    const repo = {
      findMergeCandidates: vi.fn(),
      applyGithubMergeFixed: vi.fn(),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectMergeWebhookService(repo)
    const result = await svc.handlePullRequestClosed({
      ...payload,
      pull_request: { ...payload.pull_request, base: { ref: 'develop' } },
    })
    expect(result).toEqual({ outcome: 'ignored', reason: 'base_ref_not_main' })
    delete process.env.GITHUB_DEFECT_MERGE_WEBHOOK_SECRET
  })
})
