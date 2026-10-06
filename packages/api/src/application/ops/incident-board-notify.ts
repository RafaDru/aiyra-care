import { suggestIncidentBoardFilterFromPipeline } from '../../domain/ops/incident-list-filter.js'
import type { OpsAnalysisQueueRecord } from '../../domain/ops/ops-analysis-queue.types.js'
import {
  publishIncidentBoardChange,
  type IncidentBoardChangeEvent,
} from '../../infrastructure/ops/incident-board.bus.js'
import type { OpsAnalysisQueuePgRepository } from '../../infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import { resolveDeploymentTier } from '../../domain/ops/investigator-environment.js'

export function buildIncidentBoardChangeEvent(
  record: OpsAnalysisQueueRecord,
  linkedDefects: Array<{ id: string; referenceCode: string | null }>,
  deploymentTier = resolveDeploymentTier(),
): IncidentBoardChangeEvent {
  return {
    deploymentTier,
    incidentId: record.id,
    incidentPipelineStatus: record.incidentPipelineStatus,
    legacyStatus: record.status,
    updatedAt: record.updatedAt,
    suggestedFilter: suggestIncidentBoardFilterFromPipeline(record.incidentPipelineStatus),
    linkedDefectIds: linkedDefects.map((d) => d.id),
    referenceCode: record.referenceCode,
    title: record.title,
    linkedDefects,
  }
}

export async function notifyIncidentBoardById(
  queueRepo: OpsAnalysisQueuePgRepository,
  incidentId: string,
  defectRepo?: PlatformDefectPgRepository,
): Promise<void> {
  const record = await queueRepo.findById(incidentId)
  if (!record) return
  const linkedDefects = defectRepo
    ? (await defectRepo.listDefectLinksByIncidentIds([incidentId])).get(incidentId) ?? []
    : []
  publishIncidentBoardChange(buildIncidentBoardChangeEvent(record, linkedDefects))
}

export function notifyIncidentBoardFromRecord(
  record: OpsAnalysisQueueRecord,
  linkedDefects: Array<{ id: string; referenceCode: string | null }> = [],
): void {
  publishIncidentBoardChange(buildIncidentBoardChangeEvent(record, linkedDefects))
}
