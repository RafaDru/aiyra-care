/** Fired when the post-onboarding dashboard welcome banner is dismissed. */

const EVENT = 'aiyracare:post-onboarding-welcome-dismissed'

export function notifyPostOnboardingWelcomeDismissed(): void {
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribePostOnboardingWelcomeDismissed(handler: () => void): () => void {
  const listener = () => handler()
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
