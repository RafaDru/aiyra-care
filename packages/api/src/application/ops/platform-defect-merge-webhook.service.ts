import { parseGithubDefectMergeEvent } from '../../domain/ops/github-defect-merge-payload.js'
import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import {
  resolveGithubDefectMergeBaseRef,
  resolveGithubDefectMergeWebhookSecret,
} from './platform-defect-merge-webhook.config.js'

export type DefectMergeWebhookOutcome =
  | { outcome: 'fixed'; defects: PlatformDefectRecord[]; idempotent: boolean }
  | { outcome: 'ignored'; reason: string }
  | { outcome: 'disabled'; reason: 'secret_not_configured' }

export class PlatformDefectMergeWebhookService {
  constructor(private readonly repo: PlatformDefectPgRepository) {}

  isEnabled(): boolean {
    return Boolean(resolveGithubDefectMergeWebhookSecret())
  }

  async handlePullRequestClosed(
    payload: unknown,
    options?: { baseRefOverride?: string },
  ): Promise<DefectMergeWebhookOutcome> {
    if (!this.isEnabled()) {
      return { outcome: 'disabled', reason: 'secret_not_configured' }
    }

    const parsed = parseGithubDefectMergeEvent(
      (payload ?? {}) as Parameters<typeof parseGithubDefectMergeEvent>[0],
    )
    if (!parsed.eligible) {
      return { outcome: 'ignored', reason: parsed.reason ?? 'not_eligible' }
    }

    const expectedBase = options?.baseRefOverride ?? resolveGithubDefectMergeBaseRef()
    if (parsed.baseRef && parsed.baseRef !== expectedBase) {
      return { outcome: 'ignored', reason: `base_ref_not_${expectedBase}` }
    }

    const candidates = await this.repo.findMergeCandidates({
      mergedPrUrl: parsed.mergedPrUrl!,
      referenceCodes: parsed.referenceCodes,
      defectIds: parsed.defectIds,
    })

    if (!candidates.length) {
      return { outcome: 'ignored', reason: 'no_matching_defect' }
    }

    const updated: PlatformDefectRecord[] = []
    let idempotent = true
    for (const defect of candidates) {
      const result = await this.repo.applyGithubMergeFixed(defect.id, parsed.mergedPrUrl!)
      if (!result) continue
      updated.push(result.record)
      if (!result.wasAlreadyFixed) idempotent = false
    }

    if (!updated.length) {
      return { outcome: 'ignored', reason: 'invalid_transition' }
    }

    return { outcome: 'fixed', defects: updated, idempotent }
  }
}
