import { getBirthDateValidationIssue } from './birth-date-validation.js'

export type BirthDateMessageKeys = {
  future: string
  tooOld: string
  invalid: string
}

export const ONBOARDING_BIRTH_DATE_MESSAGE_KEYS: BirthDateMessageKeys = {
  future: 'onboarding.birthDateFuture',
  tooOld: 'onboarding.birthDateTooOld',
  invalid: 'onboarding.birthDateInvalid',
}

export const PATIENT_FORM_BIRTH_DATE_MESSAGE_KEYS: BirthDateMessageKeys = {
  future: 'patient.form.birthDateFuture',
  tooOld: 'patient.form.birthDateTooOld',
  invalid: 'patient.form.birthDateInvalid',
}

export function birthDateIssueMessage(
  issue: ReturnType<typeof getBirthDateValidationIssue>,
  t: (key: string) => string,
  keys: BirthDateMessageKeys = ONBOARDING_BIRTH_DATE_MESSAGE_KEYS,
): string | null {
  if (!issue) return null
  if (issue === 'future') return t(keys.future)
  if (issue === 'too_old') return t(keys.tooOld)
  return t(keys.invalid)
}

export function isBirthDateDayjsValue(value: unknown): value is { toDate: () => Date } {
  return Boolean(value && typeof (value as { toDate?: () => Date }).toDate === 'function')
}

export function validateBirthDateField(
  value: unknown,
  t: (key: string) => string,
  keys: BirthDateMessageKeys = ONBOARDING_BIRTH_DATE_MESSAGE_KEYS,
): Promise<void> {
  if (!value) return Promise.resolve()
  if (!isBirthDateDayjsValue(value)) {
    return Promise.reject(new Error(t(keys.invalid)))
  }
  const issue = getBirthDateValidationIssue(value.toDate())
  const message = birthDateIssueMessage(issue, t, keys)
  return message ? Promise.reject(new Error(message)) : Promise.resolve()
}
