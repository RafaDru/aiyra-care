type Listener = () => void

const listeners = new Set<Listener>()

export function onOnboardingWizardChanged(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyOnboardingWizardChanged(): void {
  for (const listener of listeners) listener()
}
