import { normalizeName } from '../../application/insurance-plan/amil-beneficiary-matcher.js'
import type { MatchablePatient } from '../../application/insurance-plan/amil-beneficiary-matcher.js'

/** Associa exame do portal ao paciente local pelo nome (ex.: dependente Bruno). */
export function resolveMaterDeiPatientId(
  portalPatientName: string | null | undefined,
  linkPatientId: string,
  candidates: MatchablePatient[],
): string {
  if (!portalPatientName?.trim()) return linkPatientId
  const target = normalizeName(portalPatientName)
  if (!target) return linkPatientId

  const exact = candidates.find((p) => normalizeName(p.name) === target)
  if (exact) return exact.id

  const partial = candidates.find((p) => {
    const n = normalizeName(p.name)
    return n.includes(target) || target.includes(n)
  })
  return partial?.id ?? linkPatientId
}
