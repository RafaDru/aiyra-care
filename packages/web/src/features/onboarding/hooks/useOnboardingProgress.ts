import { useCallback, useState } from 'react'
import {
  readOnboardingWizardStep,
  type OnboardingFamilyWizardState,
  readOnboardingFamilyWizard,
} from '../../../lib/onboarding-wizard-storage.js'

/** Reads session-backed wizard step index (0 = profile, 1 = families). */
export function useOnboardingProgress() {
  const [step, setStep] = useState(readOnboardingWizardStep)
  const [familyState, setFamilyState] = useState<OnboardingFamilyWizardState | null>(readOnboardingFamilyWizard)

  const syncFromSession = useCallback(() => {
    setStep(readOnboardingWizardStep())
    setFamilyState(readOnboardingFamilyWizard())
  }, [])

  return { step, setStep, familyState, syncFromSession }
}
