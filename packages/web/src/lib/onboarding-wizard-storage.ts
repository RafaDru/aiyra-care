/** Session keys for the 2-step web onboarding wizard (titular profile → optional family). */

import { clearFirstVisitTourCompleted } from './first-visit-tour-storage.js'

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
  clearFirstVisitTourCompleted()
}

/** Session flag still set — welcome banner not dismissed yet. */
export function isOnboardingJustCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(ONBOARDING_JUST_COMPLETED_KEY) === '1'
}

export function clearOnboardingJustCompleted(): void {
  sessionStorage.removeItem(ONBOARDING_JUST_COMPLETED_KEY)
}

/** @deprecated Prefer `isOnboardingJustCompleted` + `clearOnboardingJustCompleted` on dismiss. */
export function consumeOnboardingJustCompleted(): boolean {
  if (!isOnboardingJustCompleted()) return false
  clearOnboardingJustCompleted()
  return true
}

export function isOnboardingDependentsStepActive(): boolean {
  return readOnboardingWizardStep() === 1
}
