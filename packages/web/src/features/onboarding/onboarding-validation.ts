import {
  ONBOARDING_BIRTH_DATE_MESSAGE_KEYS,
  validateBirthDateField as validateBirthDateFieldShared,
} from '../../lib/birth-date-form-validation.js'

export function isAdult(birthDate: Date): boolean {
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return age >= 18
}

export function validateBirthDateField(value: unknown, t: (key: string) => string): Promise<void> {
  return validateBirthDateFieldShared(value, t, ONBOARDING_BIRTH_DATE_MESSAGE_KEYS)
}
