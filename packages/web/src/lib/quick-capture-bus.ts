export type QuickCaptureKind = 'note' | 'measurement' | 'medication' | 'agenda' | 'document'

export interface QuickCaptureOpenRequest {
  patientId?: string
  kind?: QuickCaptureKind
}

const EVENT = 'aiyracare:quick-capture-open'

export function requestQuickCaptureOpen(request: QuickCaptureOpenRequest = {}): void {
  window.dispatchEvent(new CustomEvent<QuickCaptureOpenRequest>(EVENT, { detail: request }))
}

export function subscribeQuickCaptureOpen(
  handler: (request: QuickCaptureOpenRequest) => void,
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<QuickCaptureOpenRequest>).detail)
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
