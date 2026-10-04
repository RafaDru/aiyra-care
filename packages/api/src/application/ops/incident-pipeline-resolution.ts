import type { OpsAnalysisQueuePgRepository } from '../../infrastructure/persistence/ops-analysis-queue.pg.repository.js'

/** DEF `fixed` → incidentes vinculados em `resolved` (idempotente). */
export async function resolveIncidentsLinkedToDefect(
  queueRepo: OpsAnalysisQueuePgRepository,
  defectId: string,
): Promise<number> {
  return queueRepo.resolveIncidentsLinkedToDefect(defectId)
}
