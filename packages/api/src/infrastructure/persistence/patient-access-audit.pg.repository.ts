import type { Pool } from 'pg'
import type {
  PatientAccessAuditInsert,
  PatientAccessAuditRecord,
} from '../../domain/patient-access/patient-access-audit.types.js'

function mapRow(row: Record<string, unknown>): PatientAccessAuditRecord {
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    actorAccountId: row.actor_account_id as string,
    targetAccountId: (row.target_account_id as string | null) ?? null,
    action: row.action as PatientAccessAuditRecord['action'],
    accessLevel: (row.access_level as string | null) ?? null,
    membershipRole: (row.membership_role as string | null) ?? null,
    careCircleId: (row.care_circle_id as string | null) ?? null,
    inviteId: (row.invite_id as string | null) ?? null,
    grantId: (row.grant_id as string | null) ?? null,
    patientCount: row.patient_count != null ? Number(row.patient_count) : null,
    createdAt: new Date(row.created_at as string),
    actorDisplayName: (row.actor_display_name as string | null) ?? null,
    actorEmail: (row.actor_email as string | null) ?? null,
    targetDisplayName: (row.target_display_name as string | null) ?? null,
    targetEmail: (row.target_email as string | null) ?? null,
  }
}

export class PatientAccessAuditPgRepository {
  constructor(private readonly pool: Pool) {}

  async insert(row: PatientAccessAuditInsert): Promise<void> {
    await this.pool.query(
      `INSERT INTO patient_access_audit_events (
         patient_id, actor_account_id, target_account_id, action,
         access_level, membership_role, care_circle_id,
         invite_id, grant_id, patient_count, request_ip
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::inet)`,
      [
        row.patientId,
        row.actorAccountId,
        row.targetAccountId ?? null,
        row.action,
        row.accessLevel ?? null,
        row.membershipRole ?? null,
        row.careCircleId ?? null,
        row.inviteId ?? null,
        row.grantId ?? null,
        row.patientCount ?? null,
        row.requestIp ?? null,
      ],
    )
  }

  async listForPatient(patientId: string, limit = 50): Promise<PatientAccessAuditRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT e.*,
              aa_actor.display_name AS actor_display_name,
              aa_actor.email AS actor_email,
              aa_target.display_name AS target_display_name,
              aa_target.email AS target_email
       FROM patient_access_audit_events e
       LEFT JOIN app_accounts aa_actor ON aa_actor.id = e.actor_account_id
       LEFT JOIN app_accounts aa_target ON aa_target.id = e.target_account_id
       WHERE e.patient_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2`,
      [patientId, limit],
    )
    return rows.map(mapRow)
  }
}
