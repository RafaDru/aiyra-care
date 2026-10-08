/** Session keys for the web onboarding wizard (titular profile → care circles loop). */

import { clearFirstVisitTourCompleted } from './first-visit-tour-storage.js'

export const ONBOARDING_WIZARD_STEP_KEY = 'aiyracare.onboarding_wizard_step'
export const ONBOARDING_FAMILY_WIZARD_KEY = 'aiyracare.onboarding_family_wizard'
export const ONBOARDING_JUST_COMPLETED_KEY = 'aiyracare.onboarding_just_completed'

export type OnboardingFamilyPhase = 'name' | 'members'

export type OnboardingFamilyWizardState = {
  phase: OnboardingFamilyPhase
  circleIndex: number
  activeCircleId: string | null
  /** Names of circles already created in this wizard session (client-side uniqueness). */
  circleNames: string[]
}

export function readOnboardingWizardStep(): number {
  if (typeof window === 'undefined') return 0
  const raw = sessionStorage.getItem(ONBOARDING_WIZARD_STEP_KEY)
  if (raw === '2' || raw === 'connectors') return 2
  if (raw === '1' || raw === 'families') return 1
  return 0
}

export function persistOnboardingFamiliesStep(): void {
  sessionStorage.setItem(ONBOARDING_WIZARD_STEP_KEY, 'families')
}

export function persistOnboardingConnectorsStep(): void {
  sessionStorage.setItem(ONBOARDING_WIZARD_STEP_KEY, 'connectors')
}

/** @deprecated Use `persistOnboardingFamiliesStep` */
export function persistOnboardingDependentsStep(): void {
  persistOnboardingFamiliesStep()
}

export function readOnboardingFamilyWizard(): OnboardingFamilyWizardState | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(ONBOARDING_FAMILY_WIZARD_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as OnboardingFamilyWizardState
    if (parsed.phase !== 'name' && parsed.phase !== 'members') return null
    if (!Number.isFinite(parsed.circleIndex) || parsed.circleIndex < 0) return null
    return {
      phase: parsed.phase,
      circleIndex: parsed.circleIndex,
      activeCircleId: parsed.activeCircleId ?? null,
      circleNames: Array.isArray(parsed.circleNames) ? parsed.circleNames.map(String) : [],
    }
  } catch {
    return null
  }
}

export function persistOnboardingFamilyWizard(state: OnboardingFamilyWizardState): void {
  sessionStorage.setItem(ONBOARDING_FAMILY_WIZARD_KEY, JSON.stringify(state))
}

export function clearOnboardingFamilyWizard(): void {
  sessionStorage.removeItem(ONBOARDING_FAMILY_WIZARD_KEY)
}

export function clearOnboardingWizardStep(): void {
  sessionStorage.removeItem(ONBOARDING_WIZARD_STEP_KEY)
  clearOnboardingFamilyWizard()
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

export function isOnboardingFamiliesStepActive(): boolean {
  return readOnboardingWizardStep() === 1
}

export function isOnboardingConnectorsStepActive(): boolean {
  return readOnboardingWizardStep() === 2
}

/** @deprecated Use `isOnboardingFamiliesStepActive` */
export function isOnboardingDependentsStepActive(): boolean {
  return isOnboardingFamiliesStepActive()
}

export function defaultFamilyCircleName(profileName: string, circleIndex: number, existingNames: string[]): string {
  if (circleIndex === 0) {
    const parts = profileName.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `Família ${parts[parts.length - 1]}`
    return 'Minha família'
  }
  let n = circleIndex + 1
  let candidate = `Família ${n}`
  const taken = new Set(existingNames.map((x) => x.trim().toLowerCase()))
  while (taken.has(candidate.toLowerCase())) {
    n += 1
    candidate = `Família ${n}`
  }
  return candidate
}
