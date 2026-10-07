/** Session keys for the 2-step web onboarding wizard (titular profile → optional family). */

export const ONBOARDING_WIZARD_STEP_KEY = 'aiyracare.onboarding_wizard_step'
export const ONBOARDING_JUST_COMPLETED_KEY = 'aiyracare.onboarding_just_completed'

export function readOnboardingWizardStep(): number {
  if (typeof window === 'undefined') return 0
  return sessionStorage.getItem(ONBOARDING_WIZARD_STEP_KEY) === '1' ? 1 : 0
}

export function persistOnboardingDependentsStep(): void {
  sessionStorage.setItem(ONBOARDING_WIZARD_STEP_KEY, '1')
}

export function clearOnboardingWizardStep(): void {
  sessionStorage.removeItem(ONBOARDING_WIZARD_STEP_KEY)
}

export function markOnboardingJustCompleted(): void {
  sessionStorage.setItem(ONBOARDING_JUST_COMPLETED_KEY, '1')
}

export function consumeOnboardingJustCompleted(): boolean {
  if (typeof window === 'undefined') return false
  if (sessionStorage.getItem(ONBOARDING_JUST_COMPLETED_KEY) !== '1') return false
  sessionStorage.removeItem(ONBOARDING_JUST_COMPLETED_KEY)
  return true
}

export function isOnboardingDependentsStepActive(): boolean {
  return readOnboardingWizardStep() === 1
}
