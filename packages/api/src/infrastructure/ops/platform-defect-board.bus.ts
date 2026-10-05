import type { PlatformDefectStatus } from '../../domain/ops/platform-defect.types.js'
import type { DefectBoardStatusFilter } from '../../domain/ops/defect-board-filter.js'

export type DefectBoardChangeEvent = {
  deploymentTier: string
  defectId: string
  referenceCode: string | null
  status: PlatformDefectStatus
  updatedAt: string
  latestReview?: {
    status: string
    recommendation: string | null
  } | null
  suggestedStatusFilter: DefectBoardStatusFilter
}

type Listener = (event: DefectBoardChangeEvent) => void

const listenersByTier = new Map<string, Set<Listener>>()

export function publishDefectBoardChange(event: DefectBoardChangeEvent): void {
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

export function subscribeDefectBoard(
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
export function resetDefectBoardBus(): void {
  listenersByTier.clear()
}
