/** Espelha heurística do backend para pré-preencher parentIds no cadastro. */
export function isMinorBirthDate(birthDate: string | undefined): boolean {
  if (!birthDate) return false
  const d = new Date(birthDate.slice(0, 10) + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return false
  const ageMs = Date.now() - d.getTime()
  return ageMs < 18 * 365.25 * 24 * 60 * 60 * 1000
}
