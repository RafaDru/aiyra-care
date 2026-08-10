import type { SyncProgressPayload } from './sync-progress-store.js'

type Listener = (payload: SyncProgressPayload) => void

const listeners = new Map<string, Set<Listener>>()

export function subscribeSyncJob(jobId: string, listener: Listener): () => void {
  let set = listeners.get(jobId)
  if (!set) {
    set = new Set()
    listeners.set(jobId, set)
  }
  set.add(listener)
  return () => {
    set!.delete(listener)
    if (set!.size === 0) listeners.delete(jobId)
  }
}

export function publishSyncJobEvent(jobId: string, payload: SyncProgressPayload): void {
  const set = listeners.get(jobId)
  if (!set?.size) return
  for (const listener of set) {
    try {
      listener(payload)
    } catch {
      // subscriber error should not break sync
    }
  }
}

export function hasSyncJobSubscribers(jobId: string): boolean {
  return (listeners.get(jobId)?.size ?? 0) > 0
}
