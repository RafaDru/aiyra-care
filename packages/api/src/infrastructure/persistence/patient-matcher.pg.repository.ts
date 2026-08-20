import type { Pool } from 'pg'
import type { PatientMatcher } from '../../domain/patient/patient-matcher.js'
import { normalizeName } from '../../application/connect/connect-sync.helpers.js'

export class PgPatientMatcher implements PatientMatcher {
  constructor(private readonly pool: Pool) {}

  async findMatchingPatientId(beneficiaryName: string, possiblePatientIds: string[]): Promise<string | null> {
    if (possiblePatientIds.length === 0) return null

    const bNorm = normalizeName(beneficiaryName)
    if (!bNorm) return null

    const { rows } = await this.pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM patients WHERE id = ANY($1::uuid[])`,
      [possiblePatientIds],
    )

    const exact = rows.find((r) => normalizeName(r.name) === bNorm)
    if (exact) return exact.id

    const partial = rows.find((r) => {
      const pNorm = normalizeName(r.name)
      return pNorm.includes(bNorm) || bNorm.includes(pNorm)
    })
    if (partial) return partial.id

    return null
  }
}
