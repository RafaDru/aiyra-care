import AsyncStorage from '@react-native-async-storage/async-storage'

export const LANGUAGE_STORAGE_KEY = 'ananeri-lang'
const LANGUAGE_STORAGE_KEY_LEGACY = 'aiyra-care-lang'

export const REMEMBER_ME_KEY = 'ananeri-remember-me'
const REMEMBER_ME_KEY_LEGACY = 'aiyra-care-remember-me'

export const LAST_EMAIL_KEY = 'ananeri.mobile.last-email'
const LAST_EMAIL_KEY_LEGACY = 'aiyracare.mobile.last-email'

export const ONBOARDING_WIZARD_STEP_KEY = 'ananeri-onboarding-wizard-step'
const ONBOARDING_WIZARD_STEP_KEY_LEGACY = 'aiyra-care-onboarding-wizard-step'

export async function readStoredLanguage(): Promise<string | null> {
  const current = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (current != null) return current
  const legacy = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY_LEGACY)
  if (legacy != null) {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, legacy)
    await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY_LEGACY)
  }
  return legacy
}

export async function writeStoredLanguage(lang: string): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY_LEGACY)
}

export async function readRememberMeRaw(): Promise<string | null> {
  const current = await AsyncStorage.getItem(REMEMBER_ME_KEY)
  if (current != null) return current
  return AsyncStorage.getItem(REMEMBER_ME_KEY_LEGACY)
}

export async function writeRememberMeRaw(value: string): Promise<void> {
  await AsyncStorage.setItem(REMEMBER_ME_KEY, value)
  await AsyncStorage.removeItem(REMEMBER_ME_KEY_LEGACY)
}

export async function readLastEmail(): Promise<string | null> {
  const current = await AsyncStorage.getItem(LAST_EMAIL_KEY)
  if (current != null) return current
  return AsyncStorage.getItem(LAST_EMAIL_KEY_LEGACY)
}

export async function writeLastEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(LAST_EMAIL_KEY, email)
  await AsyncStorage.removeItem(LAST_EMAIL_KEY_LEGACY)
}

export async function removeLastEmail(): Promise<void> {
  await AsyncStorage.removeItem(LAST_EMAIL_KEY)
  await AsyncStorage.removeItem(LAST_EMAIL_KEY_LEGACY)
}

export async function readOnboardingWizardStepRaw(): Promise<string | null> {
  const current = await AsyncStorage.getItem(ONBOARDING_WIZARD_STEP_KEY)
  if (current != null) return current
  return AsyncStorage.getItem(ONBOARDING_WIZARD_STEP_KEY_LEGACY)
}

export async function writeOnboardingWizardStepRaw(step: '0' | '1'): Promise<void> {
  if (step === '0') {
    await AsyncStorage.removeItem(ONBOARDING_WIZARD_STEP_KEY)
    await AsyncStorage.removeItem(ONBOARDING_WIZARD_STEP_KEY_LEGACY)
    return
  }
  await AsyncStorage.setItem(ONBOARDING_WIZARD_STEP_KEY, step)
  await AsyncStorage.removeItem(ONBOARDING_WIZARD_STEP_KEY_LEGACY)
}