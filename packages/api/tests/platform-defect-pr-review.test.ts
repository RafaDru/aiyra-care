import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildPlatformDefectPrReviewDispatchPayload,
  defectPrReviewPlaybookId,
  dispatchPlatformDefectPrReview,
} from '../src/application/ops/platform-defect-pr-review-dispatch.js'
import {
  isChAutoPrReviewOnReadyEnabled,
  PlatformDefectPrReviewError,
  PlatformDefectPrReviewService,
} from '../src/application/ops/platform-defect-pr-review.service.js'
import { isInvestigatorCallbackAuthorized } from '../src/application/ops/ops-analysis-callback-url.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'
import type { DefectPrReviewPgRepository } from '../src/infrastructure/persistence/defect-pr-review.pg.repository.js'
import type { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'
import { PlatformDefectService } from '../src/application/ops/platform-defect.service.js'
import { platformDefectPipelineDefaults } from './fixtures/platform-defect-record.defaults.js'

const readyDefect: PlatformDefectRecord = {
  id: '0e672818-72ec-4ef7-918e-312db34bbeb5',
  referenceCode: 'DEF-000042',
  title: 'Sync silent skip',
  status: 'ready_for_pr',
  fingerprint: 'fp-abc',
  impact: 3,
  applications: ['web', 'api'],
  ownerSubject: null,
  triageSummary: 'Hipótese: session gate',
  triageArtifactPath: 'docs/ops/investigations/sample.md',
  branchName: 'cursor/fix-wallet',
  prUrl: 'https://github.com/RafaDru/aiyra-care/pull/110',
  mergedPrUrl: null,
  mergedAt: null,
  fixedVia: null,
  prBatchId: null,
  firstSeenAt: '2026-09-28T12:00:00.000Z',
  fixStartedAt: '2026-09-28T13:00:00.000Z',
  lastFixDispatchSentAt: '2026-09-28T13:00:00.000Z',
  readyForPrAt: '2026-10-04T12:00:00.000Z',
  fixedAt: null,
  lastFailureKind: null,
  lastFailureSummary: null,
  lastCorrectionFailureDetails: null,
  correctionFailedAt: null,
  createdAt: '2026-09-28T11:00:00.000Z',
  updatedAt: '2026-10-04T12:00:00.000Z',
  ...platformDefectPipelineDefaults,
}

describe('platform-defect-pr-review-dispatch', () => {
  afterEach(() => {
    delete process.env.CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_KEY
    delete process.env.OPS_INVESTIGATOR_CALLBACK_KEY
    vi.unstubAllGlobals()
  })

  it('builds defect_pr_review_v1 payload with callback URL', () => {
    process.env.OPS_INVESTIGATOR_CALLBACK_KEY = 'callback-secret'
    const built = buildPlatformDefectPrReviewDispatchPayload({
      defect: readyDefect,
      reviewId: 'rev-1',
      investigationId: '96a2e898-9d36-4495-82e6-76eb17fc555e',
      linkedIncidents: [{ id: '96a2e898-9d36-4495-82e6-76eb17fc555e', referenceCode: 'INC-000099', fingerprint: 'fp' }],
      trigger: 'manual',
    })
    expect('error' in built).toBe(false)
    if ('error' in built) return
    expect(built.type).toBe('defect_pr_review_v1')
    expect(built.reviewId).toBe('rev-1')
    expect(built.callbackUrl).toContain('/api/platform-defects/review-callback')
    expect(built.playbook).toBe(defectPrReviewPlaybookId(0))
    expect(built.text).toContain('Revisão PR')
  })

  it('skips dispatch when webhook missing', async () => {
    process.env.OPS_INVESTIGATOR_CALLBACK_KEY = 'callback-secret'
    const built = buildPlatformDefectPrReviewDispatchPayload({
      defect: readyDefect,
      reviewId: 'rev-1',
      investigationId: null,
      linkedIncidents: [],
      trigger: 'manual',
    })
    if ('error' in built) throw new Error('expected payload')
    const result = await dispatchPlatformDefectPrReview(built)
    expect(result.outcome).toBe('skipped')
  })
})

describe('platform-defect-pr-review callback auth', () => {
  afterEach(() => {
    delete process.env.OPS_INVESTIGATOR_CALLBACK_KEY
    delete process.env.OPS_METRICS_KEY
  })

  it('accepts investigator callback key', () => {
    process.env.OPS_INVESTIGATOR_CALLBACK_KEY = 'secret'
    expect(
      isInvestigatorCallbackAuthorized({ 'x-investigator-callback-key': 'secret' }),
    ).toBe(true)
  })
})

describe('isChAutoPrReviewOnReadyEnabled', () => {
  it('defaults to on unless CH_AUTO_PR_REVIEW_ON_READY=0', () => {
    expect(isChAutoPrReviewOnReadyEnabled({})).toBe(true)
    expect(isChAutoPrReviewOnReadyEnabled({ CH_AUTO_PR_REVIEW_ON_READY: '1' })).toBe(true)
    expect(isChAutoPrReviewOnReadyEnabled({ CH_AUTO_PR_REVIEW_ON_READY: '0' })).toBe(false)
  })
})

describe('PlatformDefectPrReviewService', () => {
  it('skips duplicate request-review for same defect and pr_url', async () => {
    const defectRepo = {
      findById: vi.fn(async () => readyDefect),
      listLinkedIncidentIds: vi.fn(async () => []),
      listLinkedIncidentsMeta: vi.fn(async () => []),
    } as unknown as PlatformDefectPgRepository

    const reviewRepo = {
      findRunningByDefectIdAndPrUrl: vi.fn(async () => null),
      findLatestCompletedForPrUrl: vi.fn(async () => ({
        id: 'rev-done',
        defectId: readyDefect.id,
        status: 'completed',
        trigger: 'auto_ready',
        prUrl: readyDefect.prUrl!,
        branchName: readyDefect.branchName,
        headSha: 'abc123',
        investigationId: null,
        dimensions: null,
        recommendation: 'approve',
        recommendationRationale: null,
        ciSnapshot: null,
        prReviewCommentUrl: null,
        agentRunUrl: null,
        failureDetails: null,
        rawJson: {},
        startedAt: '2026-10-05T12:00:00.000Z',
        completedAt: '2026-10-05T12:01:00.000Z',
        createdAt: '2026-10-05T12:00:00.000Z',
      })),
      findLatestByDefectId: vi.fn(async () => null),
    } as unknown as DefectPrReviewPgRepository

    const svc = new PlatformDefectPrReviewService(
      defectRepo,
      reviewRepo,
      new PlatformDefectService(defectRepo),
    )

    const result = await svc.requestReview(readyDefect.id, { trigger: 'auto_ready' })
    expect(result.outcome).toBe('skipped')
    expect(result.reason).toBe('already_reviewed')
  })

  it('processCallback persists review and returns latestReview summary', async () => {
    const defectRepo = {
      findById: vi.fn(async () => readyDefect),
      listLinkedIncidentIds: vi.fn(async () => []),
      listLinkedIncidentsMeta: vi.fn(async () => []),
      getDbPool: vi.fn(),
      recordOperatorPrApproval: vi.fn(),
      recordOperatorChangesRequested: vi.fn(),
    } as unknown as PlatformDefectPgRepository

    const reviewRepo = {
      findRunningByDefectId: vi.fn(async () => ({ id: 'rev-1' })),
      completeFromCallback: vi.fn(async () => ({
        id: 'rev-1',
        defectId: readyDefect.id,
        status: 'completed',
        trigger: 'manual',
        prUrl: readyDefect.prUrl!,
        branchName: readyDefect.branchName,
        headSha: null,
        investigationId: null,
        dimensions: {
          correctionEffectiveness: { verdict: 'plausible', summary: 'ok' },
          risk: { level: 'baixo', summary: 'local' },
          security: { verdict: 'pass', summary: 'clean' },
        },
        recommendation: 'approve',
        recommendationRationale: 'looks good',
        ciSnapshot: null,
        prReviewCommentUrl: null,
        agentRunUrl: null,
        failureDetails: null,
        rawJson: {},
        startedAt: '2026-10-05T12:00:00.000Z',
        completedAt: '2026-10-05T12:01:00.000Z',
        createdAt: '2026-10-05T12:00:00.000Z',
      })),
      syncDefectLastReview: vi.fn(async () => undefined),
      findLatestByDefectId: vi.fn(async () => ({
        id: 'rev-1',
        defectId: readyDefect.id,
        status: 'completed',
        trigger: 'manual',
        prUrl: readyDefect.prUrl!,
        branchName: readyDefect.branchName,
        headSha: null,
        investigationId: null,
        dimensions: {
          correctionEffectiveness: { verdict: 'plausible', summary: 'ok' },
          risk: { level: 'baixo', summary: 'local' },
          security: { verdict: 'pass', summary: 'clean' },
        },
        recommendation: 'approve',
        recommendationRationale: 'looks good',
        ciSnapshot: null,
        prReviewCommentUrl: null,
        agentRunUrl: null,
        failureDetails: null,
        rawJson: {},
        startedAt: '2026-10-05T12:00:00.000Z',
        completedAt: '2026-10-05T12:01:00.000Z',
        createdAt: '2026-10-05T12:00:00.000Z',
      })),
    } as unknown as DefectPrReviewPgRepository

    const svc = new PlatformDefectPrReviewService(
      defectRepo,
      reviewRepo,
      new PlatformDefectService(defectRepo),
    )

    const result = await svc.processCallback(
      {
        defectId: readyDefect.id,
        status: 'completed',
        recommendation: 'approve',
        dimensions: {
          correctionEffectiveness: { verdict: 'plausible', summary: 'ok' },
          risk: { level: 'baixo', summary: 'local' },
          security: { verdict: 'pass', summary: 'clean' },
        },
      },
      { kind: 'defect_pr_review_v1' },
    )

    expect(result.reviewId).toBe('rev-1')
    expect(result.defect.latestReview?.recommendation).toBe('approve')
    expect(result.defect.latestReview?.riskLevel).toBe('baixo')
    expect(reviewRepo.syncDefectLastReview).toHaveBeenCalled()
  })

  it('operatorApprovePr blocks without approve when CH_G3_REQUIRE_REVIEW_APPROVE=1', async () => {
    process.env.CH_G3_REQUIRE_REVIEW_APPROVE = '1'
    const defectRepo = {
      findById: vi.fn(async () => readyDefect),
      recordOperatorPrApproval: vi.fn(),
    } as unknown as PlatformDefectPgRepository
    const reviewRepo = {
      findLatestCompletedForPrUrl: vi.fn(async () => ({
        id: 'rev-1',
        recommendation: 'request_changes',
        status: 'completed',
        prUrl: readyDefect.prUrl!,
      })),
      findLatestByDefectId: vi.fn(async () => null),
    } as unknown as DefectPrReviewPgRepository
    const svc = new PlatformDefectPrReviewService(
      defectRepo,
      reviewRepo,
      new PlatformDefectService(defectRepo),
    )
    await expect(svc.operatorApprovePr(readyDefect.id)).rejects.toMatchObject({
      code: 'review_approval_required',
    })
    delete process.env.CH_G3_REQUIRE_REVIEW_APPROVE
  })

  it('operatorApprovePr allows override when gate enabled', async () => {
    process.env.CH_G3_REQUIRE_REVIEW_APPROVE = '1'
    const defectRepo = {
      findById: vi
        .fn()
        .mockResolvedValueOnce(readyDefect)
        .mockResolvedValueOnce(readyDefect),
      recordOperatorPrApproval: vi.fn(async () => undefined),
    } as unknown as PlatformDefectPgRepository
    const reviewRepo = {
      findLatestCompletedForPrUrl: vi.fn(async () => null),
      findLatestByDefectId: vi.fn(async () => null),
    } as unknown as DefectPrReviewPgRepository
    const svc = new PlatformDefectPrReviewService(
      defectRepo,
      reviewRepo,
      new PlatformDefectService(defectRepo),
    )
    const result = await svc.operatorApprovePr(readyDefect.id, {
      override: true,
      overrideReason: 'piloto notebook',
    })
    expect(result.prUrl).toBe(readyDefect.prUrl)
    expect(defectRepo.recordOperatorPrApproval).toHaveBeenCalledWith(
      readyDefect.id,
      '[override] piloto notebook',
    )
    delete process.env.CH_G3_REQUIRE_REVIEW_APPROVE
  })

  it('rejects request-review when not ready_for_pr', async () => {
    const defectRepo = {
      findById: vi.fn(async () => ({ ...readyDefect, status: 'open' as const })),
    } as unknown as PlatformDefectPgRepository
    const reviewRepo = {} as DefectPrReviewPgRepository
    const svc = new PlatformDefectPrReviewService(
      defectRepo,
      reviewRepo,
      new PlatformDefectService(defectRepo),
    )
    await expect(svc.requestReview(readyDefect.id)).rejects.toBeInstanceOf(
      PlatformDefectPrReviewError,
    )
  })
})
