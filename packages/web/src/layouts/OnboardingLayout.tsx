import type { ReactNode } from 'react'
import { OnboardingSessionEscape } from '../components/onboarding/OnboardingSessionEscape.js'
import { AuthWizardShell, OnboardingWizardFrame } from './AuthWizardShell.js'

/** Onboarding wizard — shared auth shell + card frame. */
export function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWizardShell variant="onboarding" onboardingFooter={<OnboardingSessionEscape />}>
      <OnboardingWizardFrame>{children}</OnboardingWizardFrame>
    </AuthWizardShell>
  )
}
