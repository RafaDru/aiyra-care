/** Open the first-visit tour drawer on demand (e.g. from post-onboarding welcome CTA). */

const EVENT = 'aiyracare:first-visit-tour-open'

export type FirstVisitTourOpenOptions = {
  /** Open even when `first_visit_tour_completed` is set (post-onboarding CTA). */
  force?: boolean
}

export function requestFirstVisitTourOpen(options?: FirstVisitTourOpenOptions): void {
  window.dispatchEvent(new CustomEvent<FirstVisitTourOpenOptions>(EVENT, { detail: options ?? {} }))
}

export function subscribeFirstVisitTourOpen(
  handler: (options: FirstVisitTourOpenOptions) => void,
): () => void {
  const listener = (ev: Event) => {
    const detail = (ev as CustomEvent<FirstVisitTourOpenOptions>).detail ?? {}
    handler(detail)
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
