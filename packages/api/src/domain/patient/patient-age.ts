/** Menor de 18 anos (heurística por data de nascimento). */
export function isMinorBirthDate(birthDate: Date | string): boolean {
  const d = birthDate instanceof Date
    ? birthDate
    : new Date(String(birthDate).slice(0, 10) + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return false
  const ageMs = Date.now() - d.getTime()
  return ageMs < 18 * 365.25 * 24 * 60 * 60 * 1000
}
