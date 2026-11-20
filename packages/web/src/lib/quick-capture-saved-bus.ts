export interface QuickCaptureSavedDetail {
  patientId: string
  healthThreadId?: string | null
}

const EVENT = 'aiyracare:quick-capture-saved'

export function notifyQuickCaptureSaved(detail: QuickCaptureSavedDetail): void {
  window.dispatchEvent(new CustomEvent<QuickCaptureSavedDetail>(EVENT, { detail }))
}

export function subscribeQuickCaptureSaved(handler: (detail: QuickCaptureSavedDetail) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<QuickCaptureSavedDetail>).detail)
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}