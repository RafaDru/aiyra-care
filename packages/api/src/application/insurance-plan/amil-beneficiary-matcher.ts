export interface MatchablePatient {
  id: string
  name: string
  cpf: string | null
  cns: string | null
  birthDate: Date
  parentIds: string[]
}

export interface AmilBeneficiaryForMatch {
  name: string
  marcaOtica: string
  cpf?: string
  cns?: string
  birthDate?: string
  role: 'holder' | 'dependent'
}

export function normalizeCpf(cpf: string | null | undefined): string {
  return (cpf || '').replace(/\D/g, '')
}

export function normalizeCns(cns: string | null | undefined): string {
  return (cns || '').replace(/\D/g, '')
}

export function normalizeName(name: string | null | undefined): string {
  return (name || '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim()
}

function parseBeneficiaryBirthDate(raw: string | undefined): Date | null {
  if (!raw) return null
  const d = new Date(raw.slice(0, 10) + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? null : d
}

export function birthDatesMatch(a: Date | null, b: Date | null, toleranceDays = 1): boolean {
  if (!a || !b) return false
  const diff = Math.abs(a.getTime() - b.getTime())
  return diff <= toleranceDays * 24 * 60 * 60 * 1000
}

export function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true
  const tokensA = a.split(' ').filter((t) => t.length > 2)
  const tokensB = new Set(b.split(' ').filter((t) => t.length > 2))
  let overlap = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++
  }
  return overlap >= 2
}

/** Titular + filhos/responsáveis diretos (parentIds → titular). */
export function buildHouseholdCandidates(
  holderPatientId: string,
  allPatients: MatchablePatient[],
): MatchablePatient[] {
  const holder = allPatients.find((p) => p.id === holderPatientId)
  if (!holder) return []
  const children = allPatients.filter((p) => p.parentIds.includes(holderPatientId))
  return [holder, ...children]
}

export function matchAmilBeneficiaryToPatient(
  beneficiary: AmilBeneficiaryForMatch,
  holderPatientId: string,
  household: MatchablePatient[],
  allPatients: MatchablePatient[],
): MatchablePatient | null {
  const cpf = normalizeCpf(beneficiary.cpf)
  if (cpf) {
    const byCpf = allPatients.find((p) => normalizeCpf(p.cpf) === cpf)
    if (byCpf) return byCpf
  }

  const cns = normalizeCns(beneficiary.cns)
  if (cns) {
    const byCns = allPatients.find((p) => normalizeCns(p.cns) === cns)
    if (byCns) return byCns
  }

  const bName = normalizeName(beneficiary.name)
  const bBirth = parseBeneficiaryBirthDate(beneficiary.birthDate)

  for (const p of household) {
    const pBirth = p.birthDate instanceof Date ? p.birthDate : new Date(p.birthDate)
    if (namesMatch(bName, normalizeName(p.name)) && birthDatesMatch(bBirth, pBirth)) {
      return p
    }
  }

  if (beneficiary.role === 'holder') {
    return household.find((p) => p.id === holderPatientId) ?? null
  }

  for (const p of household) {
    if (!namesMatch(bName, normalizeName(p.name))) continue
    const pBirth = p.birthDate instanceof Date ? p.birthDate : new Date(p.birthDate)
    if (bBirth && !birthDatesMatch(bBirth, pBirth)) continue
    return p
  }

  return null
}

export function isMinorBirthDate(birthDate: string | undefined): boolean {
  const d = parseBeneficiaryBirthDate(birthDate)
  if (!d) return false
  const ageMs = Date.now() - d.getTime()
  return ageMs < 18 * 365.25 * 24 * 60 * 60 * 1000
}
