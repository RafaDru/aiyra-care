import AsyncStorage from '@react-native-async-storage/async-storage'
import { notifyOnboardingWizardChanged } from './onboarding-events'

const WIZARD_STEP_KEY = 'aiyra-care-onboarding-wizard-step'

export async function getOnboardingWizardStep(): Promise<0 | 1> {
  const v = await AsyncStorage.getItem(WIZARD_STEP_KEY)
  return v === '1' ? 1 : 0
}

export async function setOnboardingWizardStep(step: 0 | 1): Promise<void> {
  if (step === 0) await AsyncStorage.removeItem(WIZARD_STEP_KEY)
  else await AsyncStorage.setItem(WIZARD_STEP_KEY, '1')
  notifyOnboardingWizardChanged()
}

export async function clearOnboardingWizard(): Promise<void> {
  await setOnboardingWizardStep(0)
}
