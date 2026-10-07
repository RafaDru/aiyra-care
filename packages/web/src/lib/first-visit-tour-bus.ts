/** Open the first-visit tour drawer on demand (e.g. from post-onboarding welcome CTA). */

const EVENT = 'aiyracare:first-visit-tour-open'

export function requestFirstVisitTourOpen(): void {
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribeFirstVisitTourOpen(handler: () => void): () => void {
  const listener = () => handler()
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
