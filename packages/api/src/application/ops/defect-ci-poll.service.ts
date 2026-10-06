import { DefectCiPipelineService } from './defect-ci-pipeline.service.js'
import {
  defectCiPollBatchLimit,
  resolveGithubDefectCiRepoFullName,
  resolveGithubOpsToken,
} from './defect-ci-pipeline.config.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import { parseGithubPullRequestUrl } from '../../domain/ops/platform-defect-pr-url.js'
import { fetchGithubCiWebhookPayloadForPullRequest } from '../../infrastructure/github/github-defect-ci-poll.client.js'
import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'

export type DefectCiPollReconcileResult = {
  polled: number
  updated: number
  ignored: number
  errors: number
  skipped?: boolean
  reason?: string
}

export type DefectCiRefreshOutcome =
  | { ok: true; defect: PlatformDefectRecord; idempotent: boolean; ignored?: boolean; reason?: string }
  | { ok: false; error: 'not_found' | 'invalid_state' | 'no_token' | 'poll_failed'; reason?: string }

export class DefectCiPollService {
  constructor(
    private readonly repo: PlatformDefectPgRepository,
    private readonly ciPipeline: DefectCiPipelineService,
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async reconcileReadyForPr(limit?: number): Promise<DefectCiPollReconcileResult> {
    const token = resolveGithubOpsToken(this.env)
    if (!token) {
      return { polled: 0, updated: 0, ignored: 0, errors: 0, skipped: true, reason: 'no_token' }
    }

    const batchLimit = limit ?? defectCiPollBatchLimit(this.env)
    const defects = await this.repo.listReadyForPrWithPrUrl(batchLimit)
    let updated = 0
    let ignored = 0
    let errors = 0

    for (const defect of defects) {
      const result = await this.pollDefectRecord(defect, token)
      if (result === 'updated') updated += 1
      else if (result === 'ignored') ignored += 1
      else errors += 1
    }

    return { polled: defects.length, updated, ignored, errors }
  }

  async refreshDefectById(defectId: string): Promise<DefectCiRefreshOutcome> {
    const token = resolveGithubOpsToken(this.env)
    if (!token) {
      return { ok: false, error: 'no_token' }
    }
    const defect = await this.repo.findById(defectId)
    if (!defect) {
      return { ok: false, error: 'not_found' }
    }
    if (defect.status !== 'ready_for_pr' || !defect.prUrl?.trim()) {
      return { ok: false, error: 'invalid_state' }
    }

    const pollResult = await this.pollDefectRecord(defect, token)
    if (pollResult === 'error') {
      return { ok: false, error: 'poll_failed' }
    }

    const refreshed = await this.repo.findById(defectId)
    if (!refreshed) {
      return { ok: false, error: 'not_found' }
    }
    return {
      ok: true,
      defect: refreshed,
      idempotent: pollResult === 'ignored',
      ...(pollResult === 'ignored' ? { ignored: true, reason: 'no_change_or_ineligible' } : {}),
    }
  }

  private async pollDefectRecord(
    defect: PlatformDefectRecord,
    token: string,
  ): Promise<'updated' | 'ignored' | 'error'> {
    const parsedPr = parseGithubPullRequestUrl(defect.prUrl)
    if (!parsedPr) return 'error'

    const fetched = await fetchGithubCiWebhookPayloadForPullRequest(parsedPr, {
      token,
      repoFullName: resolveGithubDefectCiRepoFullName(this.env),
      fetchImpl: this.fetchImpl,
    })
    if (!fetched.ok) {
      return fetched.reason === 'no_workflow_runs' ? 'ignored' : 'error'
    }

    const outcome = await this.ciPipeline.ingestGithubCiEvent(fetched.payload)
    if (outcome.outcome === 'ignored') return 'ignored'
    if (outcome.outcome === 'updated') {
      return outcome.idempotent ? 'ignored' : 'updated'
    }
    return 'error'
  }
}
