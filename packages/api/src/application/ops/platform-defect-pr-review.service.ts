import { isGithubPullRequestUrl } from '../../domain/ops/platform-defect-pr-url.js'
import type {
  DefectPrReviewCallbackInput,
  DefectPrReviewSummary,
  DefectPrReviewTrigger,
} from '../../domain/ops/defect-pr-review.types.js'
import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import {
  DefectPrReviewPgRepository,
  toDefectPrReviewSummary,
} from '../../infrastructure/persistence/defect-pr-review.pg.repository.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import {
  buildPlatformDefectPrReviewDispatchPayload,
  dispatchPlatformDefectPrReview,
} from './platform-defect-pr-review-dispatch.js'
import { PlatformDefectService, PlatformDefectTransitionError } from './platform-defect.service.js'
import { notifyDefectBoardFromRecord } from './defect-board-notify.js'

export class PlatformDefectPrReviewError extends Error {
  readonly code:
    | 'not_found'
    | 'invalid_state'
    | 'review_in_progress'
    | 'cooldown'
    | 'ci_not_green'
    | 'invalid_payload'

  constructor(
    code:
      | 'not_found'
      | 'invalid_state'
      | 'review_in_progress'
      | 'cooldown'
      | 'ci_not_green'
      | 'invalid_payload',
  ) {
    super(code)
    this.code = code
  }
}

export type PlatformDefectWithLatestReview = PlatformDefectRecord & {
  latestReview: DefectPrReviewSummary | null
}

export function isChAutoPrReviewOnReadyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.CH_AUTO_PR_REVIEW_ON_READY?.trim()
  if (!raw || raw === '1') return true
  return raw !== '0'
}

export class PlatformDefectPrReviewService {
  constructor(
    private readonly defectRepo: PlatformDefectPgRepository,
    private readonly reviewRepo: DefectPrReviewPgRepository,
    private readonly defectService: PlatformDefectService,
  ) {}

  async attachLatestReview(defect: PlatformDefectRecord): Promise<PlatformDefectWithLatestReview> {
    const latest = await this.reviewRepo.findLatestByDefectId(defect.id)
    return {
      ...defect,
      latestReview: latest ? toDefectPrReviewSummary(latest) : null,
    }
  }

  async attachLatestReviews(defects: PlatformDefectRecord[]): Promise<PlatformDefectWithLatestReview[]> {
    const ids = defects.map((d) => d.id)
    const map = await this.reviewRepo.findLatestByDefectIds(ids)
    return defects.map((defect) => {
      const latest = map.get(defect.id)
      return {
        ...defect,
        latestReview: latest ? toDefectPrReviewSummary(latest) : null,
      }
    })
  }

  async requestReview(
    defectId: string,
    options?: { force?: boolean; trigger?: DefectPrReviewTrigger; headSha?: string | null },
  ): Promise<{
    outcome: 'sent' | 'skipped'
    reason?: string
    reviewId?: string
    dispatch?: { outcome: string; reason?: string; error?: string }
    defect: PlatformDefectWithLatestReview
  }> {
    const defect = await this.defectRepo.findById(defectId)
    if (!defect) throw new PlatformDefectPrReviewError('not_found')
    if (defect.status !== 'ready_for_pr' || !isGithubPullRequestUrl(defect.prUrl)) {
      throw new PlatformDefectPrReviewError('invalid_state')
    }

    const prUrl = defect.prUrl!
    const headSha = options?.headSha?.trim() || null

    const running = await this.reviewRepo.findRunningByDefectIdAndPrUrl(defectId, prUrl)
    if (running) {
      const withReview = await this.attachLatestReview(defect)
      return { outcome: 'skipped', reason: 'review_in_progress', defect: withReview }
    }

    if (!options?.force) {
      const skip = await this.shouldSkipForReviewScope(defectId, prUrl, headSha)
      if (skip) {
        const withReview = await this.attachLatestReview(defect)
        return { outcome: 'skipped', reason: 'already_reviewed', defect: withReview }
      }
    }

    if (process.env.CH_PR_REVIEW_REQUIRE_CI_GREEN === '1') {
      throw new PlatformDefectPrReviewError('ci_not_green')
    }

    const linkedIds = await this.defectRepo.listLinkedIncidentIds(defectId)
    const investigationId = linkedIds[0] ?? null
    const linkedIncidents = await this.loadLinkedIncidents(linkedIds)

    const trigger = options?.trigger ?? 'manual'
    const review = await this.reviewRepo.insertPending({
      defectId,
      trigger,
      prUrl: defect.prUrl!,
      branchName: defect.branchName,
      investigationId,
    })

    const built = buildPlatformDefectPrReviewDispatchPayload({
      defect,
      reviewId: review.id,
      investigationId,
      linkedIncidents,
      trigger,
    })

    if ('error' in built) {
      await this.reviewRepo.markFailed(review.id, { message: built.error, code: 'callback_auth_missing' })
      throw new PlatformDefectPrReviewError('invalid_payload')
    }

    const dispatch = await dispatchPlatformDefectPrReview(built)
    if (dispatch.outcome !== 'sent') {
      await this.reviewRepo.markFailed(review.id, {
        message: dispatch.outcome === 'failed' ? dispatch.error : dispatch.reason,
        code: 'dispatch_failed',
      })
    }

    const refreshed = await this.defectRepo.findById(defectId)
    const withReview = await this.attachLatestReview(refreshed ?? defect)
    return {
      outcome: dispatch.outcome === 'sent' ? 'sent' : 'skipped',
      reason: dispatch.outcome === 'skipped' ? dispatch.reason : undefined,
      reviewId: review.id,
      dispatch,
      defect: withReview,
    }
  }

  async maybeAutoReviewOnReady(defectId: string): Promise<void> {
    if (!isChAutoPrReviewOnReadyEnabled()) return
    try {
      await this.requestReview(defectId, { trigger: 'auto_ready' })
    } catch (err) {
      console.warn(
        '[platform-defect-pr-review] auto review skipped:',
        err instanceof Error ? err.message : err,
      )
    }
  }

  async processCallback(
    input: DefectPrReviewCallbackInput,
    rawBody: Record<string, unknown>,
  ): Promise<{ reviewId: string; defect: PlatformDefectWithLatestReview }> {
    const defectId = input.defectId?.trim()
    if (!defectId) throw new PlatformDefectPrReviewError('invalid_payload')

    const defect = await this.defectRepo.findById(defectId)
    if (!defect) throw new PlatformDefectPrReviewError('not_found')

    let reviewId = input.reviewId?.trim()
    if (!reviewId) {
      const running = await this.reviewRepo.findRunningByDefectId(defectId)
      reviewId = running?.id
    }
    if (!reviewId) throw new PlatformDefectPrReviewError('invalid_payload')

    const status = input.status === 'failed' ? 'failed' : 'completed'
    const updated = await this.reviewRepo.completeFromCallback(reviewId, {
      status,
      dimensions: input.dimensions ?? null,
      recommendation: input.recommendation ?? null,
      recommendationRationale: input.recommendationRationale ?? null,
      ciSnapshot: input.ciSnapshot ?? null,
      prReviewCommentUrl: input.prReviewCommentUrl ?? null,
      agentRunUrl: input.agentRunUrl ?? null,
      headSha: input.headSha ?? null,
      failureDetails: input.failureDetails ?? null,
      rawJson: rawBody,
    })
    if (!updated) throw new PlatformDefectPrReviewError('not_found')

    await this.reviewRepo.syncDefectLastReview(
      defectId,
      updated.id,
      updated.recommendation,
    )

    const refreshed = await this.defectRepo.findById(defectId)
    const withReview = await this.attachLatestReview(refreshed ?? defect)
    notifyDefectBoardFromRecord(withReview, withReview.latestReview)
    return {
      reviewId: updated.id,
      defect: withReview,
    }
  }

  async operatorApprovePr(
    defectId: string,
    note?: string,
  ): Promise<{ prUrl: string | null; defect: PlatformDefectWithLatestReview }> {
    const defect = await this.defectRepo.findById(defectId)
    if (!defect) throw new PlatformDefectPrReviewError('not_found')
    if (defect.status !== 'ready_for_pr') {
      throw new PlatformDefectPrReviewError('invalid_state')
    }
    await this.defectRepo.recordOperatorPrApproval(defectId, note?.trim() || null)
    const refreshed = await this.defectRepo.findById(defectId)
    const withReview = await this.attachLatestReview(refreshed ?? defect)
    notifyDefectBoardFromRecord(withReview, withReview.latestReview)
    return {
      prUrl: refreshed?.prUrl ?? defect.prUrl,
      defect: withReview,
    }
  }

  async operatorRequestChanges(
    defectId: string,
    note?: string,
  ): Promise<{ defect: PlatformDefectWithLatestReview }> {
    const defect = await this.defectRepo.findById(defectId)
    if (!defect) throw new PlatformDefectPrReviewError('not_found')
    if (defect.status !== 'ready_for_pr') {
      throw new PlatformDefectPrReviewError('invalid_state')
    }
    await this.defectRepo.recordOperatorChangesRequested(defectId, note?.trim() || null)
    try {
      await this.defectService.transition(defectId, 'open', {
        skipBatch: true,
        clearFixProgress: true,
      })
    } catch (err) {
      if (err instanceof PlatformDefectTransitionError && err.code === 'invalid_transition') {
        throw new PlatformDefectPrReviewError('invalid_state')
      }
      throw err
    }
    const refreshed = await this.defectRepo.findById(defectId)
    return { defect: await this.attachLatestReview(refreshed ?? defect) }
  }

  private async loadLinkedIncidents(
    incidentIds: string[],
  ): Promise<Array<{ id: string; referenceCode: string | null; fingerprint: string | null }>> {
    if (!incidentIds.length) return []
    return this.defectRepo.listLinkedIncidentsMeta(incidentIds)
  }

  /** Idempotência: uma revisão por (defect_id, pr_url, head_sha); novo SHA no PR permite re-disparo. */
  private async shouldSkipForReviewScope(
    defectId: string,
    prUrl: string,
    headSha: string | null,
  ): Promise<boolean> {
    const completed = await this.reviewRepo.findLatestCompletedForPrUrl(defectId, prUrl)
    if (!completed) return false
    if (!headSha) return true
    if (!completed.headSha) return true
    return completed.headSha === headSha
  }
}
