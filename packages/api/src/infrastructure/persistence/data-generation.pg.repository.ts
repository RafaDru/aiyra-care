import type { Pool } from 'pg'
import type { DomainGenerationRow } from '../../domain/data-generation/data-generation.types.js'
import { isPgMissingTableError } from './pg-error.helper.js'

export class DataGenerationPgRepository {
  constructor(private readonly pool: Pool) {}

  async bump(accountId: string, patientId: string | null, domain: string): Promise<string> {
    try {
      if (!patientId) {
        const { rows } = await this.pool.query(
          `INSERT INTO data_domain_generations (account_id, patient_id, domain, generation)
           VALUES ($1, NULL, $2, NOW())
           ON CONFLICT (account_id, domain) WHERE patient_id IS NULL
           DO UPDATE SET generation = NOW()
           RETURNING generation`,
          [accountId, domain],
        )
        return new Date(rows[0].generation as string).toISOString()
      }
      const { rows } = await this.pool.query(
        `INSERT INTO data_domain_generations (account_id, patient_id, domain, generation)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (account_id, patient_id, domain) WHERE patient_id IS NOT NULL
         DO UPDATE SET generation = NOW()
         RETURNING generation`,
        [accountId, patientId, domain],
      )
      return new Date(rows[0].generation as string).toISOString()
    } catch (err) {
      if (isPgMissingTableError(err)) return new Date().toISOString()
      throw err
    }
  }

  async getGeneration(
    accountId: string,
    patientId: string | null,
    domain: string,
  ): Promise<string | null> {
    try {
      const { rows } = await this.pool.query(
        `SELECT generation FROM data_domain_generations
         WHERE account_id = $1 AND domain = $2
           AND patient_id IS NOT DISTINCT FROM $3`,
        [accountId, domain, patientId],
      )
      return rows.length
        ? new Date(rows[0].generation as string).toISOString()
        : null
    } catch (err) {
      if (isPgMissingTableError(err)) return null
      throw err
    }
  }

  async listForAccount(accountId: string): Promise<DomainGenerationRow[]> {
    try {
      const { rows } = await this.pool.query(
        `SELECT patient_id, domain, generation
         FROM data_domain_generations
         WHERE account_id = $1`,
        [accountId],
      )
      return rows.map((row) => ({
        patientId: row.patient_id as string | null,
        domain: row.domain as string,
        generation: new Date(row.generation as string).toISOString(),
      }))
    } catch (err) {
      if (isPgMissingTableError(err)) return []
      throw err
    }
  }
}
