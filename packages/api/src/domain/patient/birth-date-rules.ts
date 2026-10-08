const SAO_PAULO_TZ = 'America/Sao_Paulo'
export const PATIENT_BIRTH_DATE_MIN_YEAR = 1900

function calendarKeyInSaoPaulo(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Mensagem PT para schema Zod; null se a data é aceitável como nascimento. */
export function validatePatientBirthDate(d: Date): string | null {
  if (Number.isNaN(d.getTime())) {
    return 'Data de nascimento inválida.'
  }
  const key = calendarKeyInSaoPaulo(d)
  const today = calendarKeyInSaoPaulo(new Date())
  if (key > today) {
    return 'A data de nascimento não pode ser no futuro.'
  }
  const year = Number.parseInt(key.slice(0, 4), 10)
  if (year < PATIENT_BIRTH_DATE_MIN_YEAR) {
    return `A data de nascimento deve ser a partir de ${PATIENT_BIRTH_DATE_MIN_YEAR}.`
  }
  return null
}
