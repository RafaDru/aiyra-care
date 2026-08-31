import type { Pool } from 'pg'
import type { RuntimeDegradedStateValue } from '../../domain/ops/runtime-degraded.types.js'
import { RUNTIME_DEGRADED_KEYS } from '../../domain/ops/runtime-degraded.types.js'
import { isPgMissingTableError } from './pg-error.helper.js'

export interface DegradedReadSnapshotRow {
  patientId: string
  asOf: string
  payload: Record<string, unknown>
  updatedAt: string
}

export class RuntimeDegradedPgRepository {
  constructor(private readonly pool: Pool) {}

  async loadState(): Promise<RuntimeDegradedStateValue | null> {
    try {
      const { rows } = await this.pool.query(
        `SELECT value FROM runtime_degraded_state WHERE key = $1`,
        [RUNTIME_DEGRADED_KEYS.state],
      )
      if (!rows[0]) return null
      return rows[0].value as RuntimeDegradedStateValue
    } catch (err) {
      if (isPgMissingTableError(err)) return null
      throw err
    }
  }

  async saveState(value: RuntimeDegradedStateValue): Promise<void> {
    try {
      await this.pool.query(
      `INSERT INTO runtime_degraded_state (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [RUNTIME_DEGRADED_KEYS.state, JSON.stringify(value)],
    )
    } catch (err) {
      if (isPgMissingTableError(err)) return
      throw err
    }
  }

  async upsertDegradedReadSnapshot(
    patientId: string,
    asOf: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO degraded_read_snapshots (patient_id, as_of, payload, updated_at)
       VALUES ($1, $2::date, $3::jsonb, NOW())
       ON CONFLICT (patient_id) DO UPDATE SET
         as_of = EXCLUDED.as_of,
         payload = EXCLUDED.payload,
         updated_at = NOW()`,
      [patientId, asOf, JSON.stringify(payload)],
    )
  }

  async findDegradedReadSnapshot(patientId: string): Promise<DegradedReadSnapshotRow | null> {
    try {
      const { rows } = await this.pool.query(
      `SELECT patient_id, as_of, payload, updated_at
       FROM degraded_read_snapshots WHERE patient_id = $1`,
      [patientId],
    )
    if (!rows[0]) return null
    const row = rows[0] as Record<string, unknown>
    return {
      patientId: row.patient_id as string,
      asOf: String(row.as_of),
      payload: (row.payload as Record<string, unknown>) ?? {},
      updatedAt: new Date(row.updated_at as string).toISOString(),
    }
    } catch (err) {
      if (isPgMissingTableError(err)) return null
      throw err
    }
  }

  async listPatientIdsForSnapshot(): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT id FROM patients WHERE owner_account_id IS NOT NULL
       UNION
       SELECT DISTINCT patient_id FROM patient_memberships`,
    )
    return rows.map((r) => r.id as string)
  }
}
