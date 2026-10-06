import type { OpsAnalysisQueuePgRepository } from '../../infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import { notifyIncidentBoardById } from './incident-board-notify.js'

/** DEF `fixed` → incidentes vinculados em `resolved` (idempotente). */
export async function resolveIncidentsLinkedToDefect(
  queueRepo: OpsAnalysisQueuePgRepository,
  defectId: string,
  options?: { defectRepo?: PlatformDefectPgRepository },
): Promise<number> {
  const incidentIds = await queueRepo.resolveIncidentsLinkedToDefect(defectId)
  if (options?.defectRepo) {
    for (const incidentId of incidentIds) {
      await notifyIncidentBoardById(queueRepo, incidentId, options.defectRepo).catch(() => undefined)
    }
  }
  return incidentIds.length
}
