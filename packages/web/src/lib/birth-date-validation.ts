const SAO_PAULO_TZ = 'America/Sao_Paulo'
export const BIRTH_DATE_MIN_YEAR = 1900

export type BirthDateValidationIssue = 'invalid' | 'future' | 'too_old'

function calendarKeyInSaoPaulo(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function getBirthDateValidationIssue(value: Date | undefined | null): BirthDateValidationIssue | null {
  if (!value || Number.isNaN(value.getTime())) {
    return value == null ? null : 'invalid'
  }
  const key = calendarKeyInSaoPaulo(value)
  const today = calendarKeyInSaoPaulo(new Date())
  if (key > today) return 'future'
  const year = Number.parseInt(key.slice(0, 4), 10)
  if (year < BIRTH_DATE_MIN_YEAR) return 'too_old'
  return null
}
