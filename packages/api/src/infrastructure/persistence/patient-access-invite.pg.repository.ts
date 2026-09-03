import { randomBytes } from 'crypto'
import type { Pool } from 'pg'
import type { PatientAccessInviteRepository } from '../../domain/patient-access/patient-access-invite.repository.js'
import type {
  PatientAccessInviteData,
  PatientAccessInvitePreview,
  PatientAccessInviteStatus,
} from '../../domain/patient-access/patient-access-invite.types.js'
import type { PatientAccessLevel } from '../../domain/patient-access/patient-access.types.js'
import type { PatientAccessInviteCircleRole } from '../../domain/patient-access/patient-access-invite.types.js'

function mapRow(row: Record<string, unknown>): PatientAccessInviteData {
  return {
    id: String(row.id),
    inviterAccountId: String(row.inviter_account_id),
    inviteeEmail: String(row.invitee_email),
    patientIds: (row.patient_ids as string[]).map(String),
    accessLevel: row.access_level as PatientAccessLevel,
    membershipRole: row.membership_role as PatientAccessInviteData['membershipRole'],
    careCircleId: row.care_circle_id ? String(row.care_circle_id) : null,
    circleRole: (row.circle_role as PatientAccessInviteCircleRole) ?? 'member',
    token: String(row.token),
    legitimacyAck: Boolean(row.legitimacy_ack),
    status: row.status as PatientAccessInviteStatus,
    expiresAt: new Date(row.expires_at as string),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at as string) : null,
    acceptedByAccountId: row.accepted_by_account_id ? String(row.accepted_by_account_id) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export class PatientAccessInvitePgRepository implements PatientAccessInviteRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    inviterAccountId: string
    inviteeEmail: string
    patientIds: string[]
    accessLevel: PatientAccessLevel
    membershipRole: PatientMembershipRole
    careCircleId?: string | null
    circleRole?: PatientAccessInviteCircleRole
    token: string
    legitimacyAck: boolean
    expiresAt: Date
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO patient_access_invites (
         inviter_account_id, invitee_email, patient_ids, access_level, membership_role,
         care_circle_id, circle_role, token, legitimacy_ack, expires_at
       ) VALUES ($1, lower($2), $3::uuid[], $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.inviterAccountId,
        input.inviteeEmail.trim(),
        input.patientIds,
        input.accessLevel,
        input.membershipRole,
        input.careCircleId ?? null,
        input.circleRole ?? 'member',
        input.token,
        input.legitimacyAck,
        input.expiresAt,
      ],
    )
    return mapRow(rows[0] as Record<string, unknown>)
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT * FROM patient_access_invites WHERE id = $1`, [id])
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null
  }

  async findByToken(token: string) {
    const { rows } = await this.pool.query(`SELECT * FROM patient_access_invites WHERE token = $1`, [token])
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null
  }

  async listByInviter(inviterAccountId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM patient_access_invites
       WHERE inviter_account_id = $1
       ORDER BY created_at DESC`,
      [inviterAccountId],
    )
    return rows.map((r) => mapRow(r as Record<string, unknown>))
  }

  async listPendingForEmail(email: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM patient_access_invites
       WHERE lower(invitee_email) = lower($1) AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [email.trim()],
    )
    return rows.map((r) => mapRow(r as Record<string, unknown>))
  }

  async updateStatus(id: string, status: PatientAccessInviteStatus, acceptedByAccountId?: string) {
    const { rows } = await this.pool.query(
      `UPDATE patient_access_invites
       SET status = $2,
           accepted_at = CASE WHEN $2 = 'accepted' THEN NOW() ELSE accepted_at END,
           accepted_by_account_id = COALESCE($3, accepted_by_account_id),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, acceptedByAccountId ?? null],
    )
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null
  }

  async getPreview(token: string): Promise<PatientAccessInvitePreview | null> {
    const { rows } = await this.pool.query(
      `SELECT i.invitee_email, i.access_level, i.status, i.expires_at,
              a.display_name AS inviter_display_name,
              c.name AS circle_name,
              array_agg(p.name ORDER BY p.name) AS patient_names
       FROM patient_access_invites i
       JOIN app_accounts a ON a.id = i.inviter_account_id
       JOIN patients p ON p.id = ANY(i.patient_ids)
       LEFT JOIN care_circles c ON c.id = i.care_circle_id
       WHERE i.token = $1
       GROUP BY i.id, a.display_name, c.name`,
      [token],
    )
    if (!rows[0]) return null
    const row = rows[0] as Record<string, unknown>
    return {
      inviteeEmail: String(row.invitee_email),
      patientNames: (row.patient_names as string[]) ?? [],
      inviterDisplayName: row.inviter_display_name ? String(row.inviter_display_name) : null,
      circleName: row.circle_name ? String(row.circle_name) : null,
      accessLevel: row.access_level as PatientAccessLevel,
      status: row.status as PatientAccessInviteStatus,
      expiresAt: new Date(row.expires_at as string),
    }
  }
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}
