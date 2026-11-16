import { readOnboardingWizardStepRaw, writeOnboardingWizardStepRaw } from './ananeri-storage-keys'
import { notifyOnboardingWizardChanged } from './onboarding-events'

export async function getOnboardingWizardStep(): Promise<0 | 1> {
  const v = await readOnboardingWizardStepRaw()
  return v === '1' ? 1 : 0
}

export async function setOnboardingWizardStep(step: 0 | 1): Promise<void> {
  await writeOnboardingWizardStepRaw(step === 1 ? '1' : '0')
  notifyOnboardingWizardChanged()
}

export async function clearOnboardingWizard(): Promise<void> {
  await setOnboardingWizardStep(0)
}