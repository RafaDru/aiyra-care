type Listener = () => void

const listeners = new Set<Listener>()

export function onComplianceAccepted(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitComplianceAccepted(): void {
  listeners.forEach((fn) => fn())
}
