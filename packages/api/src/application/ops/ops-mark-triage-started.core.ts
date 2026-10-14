import type { IncidentPipelineStatus } from '../../domain/ops/ops-analysis-queue.types.js'
import type { OpsAnalysisQueuePgRepository } from '../../infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import { notifyIncidentBoardById } from './incident-board-notify.js'

const TRIAGE_STARTED_NOOP_PIPELINE: IncidentPipelineStatus[] = [
  'in_triage',
  'triaged',
  'resolved',
  'dismissed',
]

export type MarkTriageStartedResult =
  | { ok: true; incidentPipelineStatus: 'in_triage'; noop?: true }
  | { ok: false; error: 'not_found' }
  | { ok: false; error: 'invalid_state'; message: string }

/** Shared with HTTP `triage-started` and post-dispatch auto-promotion (CH D9). */
export async function applyMarkTriageStarted(
  repo: OpsAnalysisQueuePgRepository,
  queueId: string,
  defectRepo?: PlatformDefectPgRepository,
): Promise<MarkTriageStartedResult> {
  const record = await repo.findById(queueId)
  if (!record) return { ok: false, error: 'not_found' }

  const pipeline = record.incidentPipelineStatus
  if (TRIAGE_STARTED_NOOP_PIPELINE.includes(pipeline)) {
    return { ok: true, incidentPipelineStatus: 'in_triage', noop: true }
  }

  const fromDispatch = pipeline === 'forwarded' || pipeline === 'queued_worker'
  const fromOpenInvestigating = pipeline === 'open' && record.status === 'investigating'

  if (!fromDispatch && !fromOpenInvestigating) {
    if (pipeline === 'dispatch_failed') {
      return {
        ok: false,
        error: 'invalid_state',
        message: 'incident dispatch failed — retry dispatch before triage',
      }
    }
    if (pipeline === 'open') {
      return {
        ok: false,
        error: 'invalid_state',
        message: 'incident not forwarded to automation yet',
      }
    }
    return {
      ok: false,
      error: 'invalid_state',
      message: `cannot start triage from pipeline ${pipeline}`,
    }
  }

  await repo.markPipelineInTriage(queueId)
  if (record.status !== 'investigating' && record.status !== 'fix_proposed') {
    await repo.markInvestigating(queueId)
  }
  if (defectRepo) {
    await notifyIncidentBoardById(repo, queueId, defectRepo).catch(() => undefined)
  } else {
    await notifyIncidentBoardById(repo, queueId).catch(() => undefined)
  }
  return { ok: true, incidentPipelineStatus: 'in_triage' }
}
