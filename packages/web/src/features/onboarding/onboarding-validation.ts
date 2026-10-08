import { getBirthDateValidationIssue } from '../../lib/birth-date-validation.js'

export function isAdult(birthDate: Date): boolean {
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return age >= 18
}

function birthDateRangeMessage(
  issue: ReturnType<typeof getBirthDateValidationIssue>,
  t: (key: string) => string,
): string | null {
  if (!issue) return null
  if (issue === 'future') return t('onboarding.birthDateFuture')
  if (issue === 'too_old') return t('onboarding.birthDateTooOld')
  return t('onboarding.birthDateInvalid')
}

export function validateBirthDateField(value: unknown, t: (key: string) => string): Promise<void> {
  if (!value) return Promise.resolve()
  const date = (value as { toDate?: () => Date }).toDate?.() ?? (value as Date)
  const issue = getBirthDateValidationIssue(date)
  const message = birthDateRangeMessage(issue, t)
  return message ? Promise.reject(new Error(message)) : Promise.resolve()
}
