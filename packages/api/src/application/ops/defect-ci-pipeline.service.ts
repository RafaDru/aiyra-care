import { parseGithubDefectCiEvent } from '../../domain/ops/github-defect-ci-payload.js'
import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import { notifyDefectBoardFromRecord } from './defect-board-notify.js'
import {
  isDefectCiAutoReopenOnFailEnabled,
  isDefectCiWebhookEnabled,
  resolveGithubDefectCiRepoFullName,
} from './defect-ci-pipeline.config.js'

export type DefectCiPipelineHandleOutcome =
  | { outcome: 'disabled'; reason: 'webhook_disabled' }
  | { outcome: 'ignored'; reason: string }
  | {
      outcome: 'updated'
      defects: PlatformDefectRecord[]
      reopenedDefectIds: string[]
      idempotent: boolean
    }

export class DefectCiPipelineService {
  constructor(
    private readonly repo: PlatformDefectPgRepository,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  isEnabled(): boolean {
    return isDefectCiWebhookEnabled(this.env)
  }

  async handleGithubEvent(payload: unknown): Promise<DefectCiPipelineHandleOutcome> {
    if (!this.isEnabled()) {
      return { outcome: 'disabled', reason: 'webhook_disabled' }
    }
    return this.ingestGithubCiEvent(payload)
  }

  /** Webhook + CI poll reconciler — does not require webhook secret. */
  async ingestGithubCiEvent(payload: unknown): Promise<DefectCiPipelineHandleOutcome> {
    const parsed = parseGithubDefectCiEvent(payload)
    if (!parsed.eligible || !parsed.pipelineStatus) {
      return { outcome: 'ignored', reason: parsed.reason ?? 'not_eligible' }
    }

    const expectedRepo = resolveGithubDefectCiRepoFullName(this.env).toLowerCase()
    if (parsed.repoFullName && parsed.repoFullName.toLowerCase() !== expectedRepo) {
      return { outcome: 'ignored', reason: 'repo_mismatch' }
    }

    const defects = await this.repo.findActiveDefectsByPrUrls(parsed.pullRequestUrls)
    if (!defects.length) {
      return { outcome: 'ignored', reason: 'no_matching_defect' }
    }

    const autoReopen =
      parsed.isTerminalFailure && isDefectCiAutoReopenOnFailEnabled(this.env)
    const failureSummary = parsed.failedJobs.length
      ? `CI falhou — jobs: ${parsed.failedJobs.join(', ')}`
      : 'CI falhou na branch do PR'

    const updated: PlatformDefectRecord[] = []
    const reopenedDefectIds: string[] = []
    let idempotent = true

    for (const defect of defects) {
      if (
        defect.pipelineStatus === parsed.pipelineStatus
        && defect.lastCiRunUrl === parsed.runUrl
        && defect.status !== 'ready_for_pr'
      ) {
        updated.push(defect)
        continue
      }

      let record: PlatformDefectRecord | null = null

      if (autoReopen && defect.status === 'ready_for_pr' && parsed.pipelineStatus === 'ci_failed') {
        record = await this.repo.applyCiFailureReopen(defect.id, {
          failureSummary,
          failureDetails: {
            failedJobs: parsed.failedJobs,
            runUrl: parsed.runUrl,
            snapshot: parsed.snapshot,
          },
          correctionFailureDetails: {
            message: failureSummary,
            code: 'ci_failed',
            ...(parsed.runUrl ? { runUrl: parsed.runUrl } : {}),
          },
          lastCiRunUrl: parsed.runUrl,
          lastCiSnapshot: parsed.snapshot,
        })
        if (record) {
          reopenedDefectIds.push(record.id)
          idempotent = false
        }
      } else {
        record = await this.repo.applyCiPipelineSnapshot(defect.id, {
          pipelineStatus: parsed.pipelineStatus,
          lastCiRunUrl: parsed.runUrl,
          lastCiSnapshot: parsed.snapshot,
          ...(parsed.isTerminalFailure
            ? {
                failureKind: 'ci' as const,
                failureSummary,
                failureDetails: {
                  failedJobs: parsed.failedJobs,
                  runUrl: parsed.runUrl,
                  snapshot: parsed.snapshot,
                },
              }
            : {}),
        })
        if (record && record.pipelineStatus !== defect.pipelineStatus) {
          idempotent = false
        }
      }

      const finalRecord = record ?? defect
      updated.push(finalRecord)
      notifyDefectBoardFromRecord(finalRecord)
    }

    return {
      outcome: 'updated',
      defects: updated,
      reopenedDefectIds,
      idempotent,
    }
  }
}
