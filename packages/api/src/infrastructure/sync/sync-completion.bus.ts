import type { SyncCompletionEvent } from './sync-completion.types.js'

type PatientListener = (event: SyncCompletionEvent) => void

const patientListeners = new Map<string, Set<PatientListener>>()

type TerminalNotifier = (event: Omit<SyncCompletionEvent, 'patientId'>) => void | Promise<void>

let terminalNotifier: TerminalNotifier | null = null

export function bindSyncCompletionNotifier(notifier: TerminalNotifier): void {
  terminalNotifier = notifier
}

export function subscribePatientSyncCompletions(
  patientId: string,
  listener: PatientListener,
): () => void {
  let set = patientListeners.get(patientId)
  if (!set) {
    set = new Set()
    patientListeners.set(patientId, set)
  }
  set.add(listener)
  return () => {
    set!.delete(listener)
    if (set!.size === 0) patientListeners.delete(patientId)
  }
}

export function publishSyncCompletion(event: SyncCompletionEvent): void {
  const set = patientListeners.get(event.patientId)
  if (set?.size) {
    for (const listener of set) {
      try {
        listener(event)
      } catch {
        // subscriber errors must not break sync
      }
    }
  }
}

export async function notifySyncJobTerminal(
  event: Omit<SyncCompletionEvent, 'patientId'>,
): Promise<void> {
  if (!terminalNotifier) return
  try {
    await terminalNotifier(event)
  } catch {
    // notifier failure must not break sync
  }
}
