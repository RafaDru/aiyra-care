/** Idade legível para cards (paridade `DashboardPatientCard` web). */
export function formatPatientAge(
  birthDate: string | undefined,
  t: (key: string) => string,
): string {
  if (!birthDate) return '—'
  const months = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  )
  if (months < 24) return `${months} ${t('patient.months')}`
  return `${Math.floor(months / 12)} ${t('patient.age')}`
}
