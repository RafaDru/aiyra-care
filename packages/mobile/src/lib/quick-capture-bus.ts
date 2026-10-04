export type QuickCaptureKind =
  | 'note'
  | 'symptom'
  | 'measurement'
  | 'medication'
  | 'agenda'
  | 'document'

export interface QuickCaptureOpenRequest {
  patientId?: string
  kind?: QuickCaptureKind
}

type Listener = (request: QuickCaptureOpenRequest) => void

const listeners = new Set<Listener>()

/** Abre o sheet de registro rápido (paridade web `requestQuickCaptureOpen`). */
export function requestQuickCaptureOpen(request: QuickCaptureOpenRequest = {}): void {
  for (const handler of listeners) handler(request)
}

export function subscribeQuickCaptureOpen(handler: Listener): () => void {
  listeners.add(handler)
  return () => listeners.delete(handler)
}
