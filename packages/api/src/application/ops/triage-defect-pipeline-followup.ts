import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import type { OpsAnalysisQueuePgRepository } from '../../infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import { autoStartFixOnTriage } from './ch-batch-cadence.config.js'
import { resolveIncidentsLinkedToDefect } from './incident-pipeline-resolution.js'
import {
  dispatchErrorMessage,
  startPlatformDefectFixWithDispatch,
} from './platform-defect-fix-dispatch.js'
import type { PlatformDefectService } from './platform-defect.service.js'

export type TriageDefectPipelineOutcome = 'triaged' | 'resolved'

/** Pós-triagem: resolve INC se DEF já `fixed`; opcional auto `start-fix` (env). */
export async function finalizeTriageDefectPipeline(args: {
  defect: PlatformDefectRecord
  incidentId: string
  queueRepo: OpsAnalysisQueuePgRepository
  defectService: PlatformDefectService
  defectRepo: PlatformDefectPgRepository
}): Promise<TriageDefectPipelineOutcome> {
  const { defect, incidentId, queueRepo, defectService, defectRepo } = args

  if (defect.status === 'fixed') {
    await resolveIncidentsLinkedToDefect(queueRepo, defect.id)
    return 'resolved'
  }

  await queueRepo.setIncidentPipelineStatus(incidentId, 'triaged')

  if (
    autoStartFixOnTriage() &&
    (defect.status === 'open' || defect.status === 'in_fix')
  ) {
    try {
      const { dispatch } = await startPlatformDefectFixWithDispatch(
        defectService,
        defectRepo,
        defect.id,
      )
      const errMsg = dispatchErrorMessage(dispatch)
      console.log(
        '[triage-defect-pipeline] auto start-fix',
        JSON.stringify({
          defectId: defect.id,
          referenceCode: defect.referenceCode,
          statusBefore: defect.status,
          outcome: dispatch.outcome,
          ...(errMsg ? { detail: errMsg } : {}),
        }),
      )
    } catch (err) {
      console.warn(
        '[triage-defect-pipeline] auto start-fix error',
        defect.id,
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  return 'triaged'
}
