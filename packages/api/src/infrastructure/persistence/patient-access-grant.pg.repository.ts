import type { Pool } from 'pg'
import type {
  PatientAccessGrantData,
  PatientAccessLevel,
  PatientMembershipRole,
} from '../../domain/patient-access/patient-access.types.js'
import type { PatientAccessGrantRepository } from '../../domain/patient-access/patient-access.repository.js'

function mapRow(row: Record<string, unknown>): PatientAccessGrantData {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    accountId: String(row.account_id),
    accessLevel: row.access_level as PatientAccessLevel,
    membershipRole: row.membership_role as PatientMembershipRole,
    grantedBy: row.granted_by ? String(row.granted_by) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    email: row.email ? String(row.email) : null,
    displayName: row.display_name ? String(row.display_name) : null,
  }
}

export class PatientAccessGrantPgRepository implements PatientAccessGrantRepository {
  constructor(private readonly pool: Pool) {}

  async listActiveForPatient(patientId: string) {
    const { rows } = await this.pool.query(
      `SELECT g.*, a.email, a.display_name
       FROM patient_access_grants g
       JOIN app_accounts a ON a.id = g.account_id
       WHERE g.patient_id = $1 AND g.revoked_at IS NULL
       ORDER BY g.created_at`,
      [patientId],
    )
    return rows.map((r) => mapRow(r as Record<string, unknown>))
  }

  async listAccessiblePatientIds(accountId: string) {
    try {
      const { rows } = await this.pool.query(
        `SELECT DISTINCT patient_id::text AS patient_id
         FROM patient_access_grants
         WHERE account_id = $1 AND revoked_at IS NULL`,
        [accountId],
      )
      if (rows.length > 0) {
        return rows.map((r) => r.patient_id as string)
      }
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== '42P01') throw err
    }
    return this.listAccessiblePatientIdsLegacy(accountId)
  }

  private async listAccessiblePatientIdsLegacy(accountId: string) {
    const legacy = await this.pool.query(
      `SELECT DISTINCT patient_id::text AS patient_id FROM (
         SELECT patient_id FROM patient_memberships WHERE account_id = $1
         UNION ALL
         SELECT id AS patient_id FROM patients WHERE owner_account_id = $1
       ) accessible`,
      [accountId],
    )
    return legacy.rows.map((r) => r.patient_id as string)
  }

  async findActive(patientId: string, accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM patient_access_grants
       WHERE patient_id = $1 AND account_id = $2 AND revoked_at IS NULL`,
      [patientId, accountId],
    )
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null
  }

  async findById(grantId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM patient_access_grants WHERE id = $1`,
      [grantId],
    )
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null
  }

  async upsertActive(input: {
    patientId: string
    accountId: string
    accessLevel: PatientAccessLevel
    membershipRole: PatientMembershipRole
    grantedBy: string | null
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO patient_access_grants (
         patient_id, account_id, access_level, membership_role, granted_by
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (patient_id, account_id)
       DO UPDATE SET
         access_level = EXCLUDED.access_level,
         membership_role = EXCLUDED.membership_role,
         granted_by = COALESCE(patient_access_grants.granted_by, EXCLUDED.granted_by),
         revoked_at = NULL,
         updated_at = NOW()
       RETURNING *`,
      [
        input.patientId,
        input.accountId,
        input.accessLevel,
        input.membershipRole,
        input.grantedBy,
      ],
    )
    return mapRow(rows[0] as Record<string, unknown>)
  }

  async revoke(grantId: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE patient_access_grants
       SET revoked_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL`,
      [grantId],
    )
    return (rowCount ?? 0) > 0
  }

  async countActiveFullGrants(patientId: string) {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS c FROM patient_access_grants g
       INNER JOIN patients p ON p.id = g.patient_id
       WHERE g.patient_id = $1 AND g.revoked_at IS NULL
         AND g.access_level = 'full' AND g.membership_role != 'self'
         AND g.account_id IS DISTINCT FROM p.owner_account_id`,
      [patientId],
    )
    return rows[0]?.c ?? 0
  }
}
