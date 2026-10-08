import type { ReactNode } from 'react'
import { AuthWizardShell, OnboardingWizardFrame } from './AuthWizardShell.js'

/** Onboarding wizard — shared auth shell + card frame. */
export function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWizardShell variant="onboarding">
      <OnboardingWizardFrame>{children}</OnboardingWizardFrame>
    </AuthWizardShell>
  )
}
