const EVENT = 'aiyracare:patient-create-open'

export function requestPatientCreateOpen(): void {
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribePatientCreateOpen(handler: () => void): () => void {
  const listener = () => handler()
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
