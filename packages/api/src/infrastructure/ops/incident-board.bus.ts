import type { IncidentBoardFilter } from '../../domain/ops/incident-list-filter.js'
import type {
  AnalysisQueueStatus,
  IncidentPipelineStatus,
} from '../../domain/ops/ops-analysis-queue.types.js'

export type IncidentBoardChangeEvent = {
  deploymentTier: string
  incidentId: string
  incidentPipelineStatus: IncidentPipelineStatus
  legacyStatus: AnalysisQueueStatus
  updatedAt: string
  suggestedFilter: IncidentBoardFilter
  linkedDefectIds?: string[]
  referenceCode?: string | null
  title?: string
  linkedDefects?: Array<{ id: string; referenceCode: string | null }>
}

type Listener = (event: IncidentBoardChangeEvent) => void

const listenersByTier = new Map<string, Set<Listener>>()

export function publishIncidentBoardChange(event: IncidentBoardChangeEvent): void {
  const set = listenersByTier.get(event.deploymentTier)
  if (!set?.size) return
  for (const listener of set) {
    try {
      listener(event)
    } catch {
      // subscriber errors must not break publishers
    }
  }
}

export function subscribeIncidentBoard(
  deploymentTier: string,
  listener: Listener,
): () => void {
  let set = listenersByTier.get(deploymentTier)
  if (!set) {
    set = new Set()
    listenersByTier.set(deploymentTier, set)
  }
  set.add(listener)
  return () => {
    set!.delete(listener)
    if (set!.size === 0) listenersByTier.delete(deploymentTier)
  }
}

/** Test hook — reset subscribers between vitest cases. */
export function resetIncidentBoardBus(): void {
  listenersByTier.clear()
}
