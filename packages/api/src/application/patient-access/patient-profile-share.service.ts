import type { Pool } from 'pg'
import { randomBytes } from 'crypto'
import {
  PROFILE_SHARE_TTL_DAYS,
  type AcceptProfileShareInput,
  type CreateProfileShareInput,
  type PatientProfileShareInvite,
} from '../../domain/patient-access/patient-profile-share.types.js'
import type { PatientAccessAuditService } from './patient-access-audit.service.js'
import {
  dispatchFamilyAccessEmail,
  FamilyAccessEmailService,
} from '../notifications/family-access-email.service.js'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function generateToken() {
  return randomBytes(24).toString('hex')
}

function mapInvite(row: Record<string, unknown>): PatientProfileShareInvite {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name ?? ''),
    ownerAccountId: String(row.owner_account_id),
    ownerDisplayName: row.owner_display_name ? String(row.owner_display_name) : null,
    targetAccountEmail: String(row.target_account_email),
    targetCircleId: row.target_circle_id ? String(row.target_circle_id) : null,
    targetCircleName: row.target_circle_name ? String(row.target_circle_name) : null,
    status: row.status as PatientProfileShareInvite['status'],
    token: String(row.token),
    legitimacyAck: Boolean(row.legitimacy_ack),
    expiresAt: new Date(row.expires_at as string),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at as string) : null,
    acceptedByAccountId: row.accepted_by_account_id ? String(row.accepted_by_account_id) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

const INVITE_SELECT = `
  SELECT i.*,
         p.name AS patient_name,
         o.display_name AS owner_display_name,
         c.name AS target_circle_name
  FROM patient_profile_share_invites i
  JOIN patients p ON p.id = i.patient_id
  JOIN app_accounts o ON o.id = i.owner_account_id
  LEFT JOIN care_circles c ON c.id = i.target_circle_id
`

export class PatientProfileShareService {
  constructor(
    private readonly pool: Pool,
    private readonly webBaseUrl: string,
    private readonly audit?: PatientAccessAuditService,
    private readonly emails?: FamilyAccessEmailService,
  ) {}

  async create(input: CreateProfileShareInput): Promise<PatientProfileShareInvite> {
    if (!input.legitimacyAck) throw new Error('PROFILE_SHARE_LEGITIMACY_REQUIRED')

    const email = normalizeEmail(input.targetAccountEmail)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('PROFILE_SHARE_INVALID_EMAIL')
    }

    await this.assertOwnsPatient(input.patientId, input.ownerAccountId)

    const ownerEmail = await this.getAccountEmail(input.ownerAccountId)
    if (ownerEmail && ownerEmail === email) {
      throw new Error('PROFILE_SHARE_SELF')
    }

    const pending = await this.findPendingDuplicate(input.patientId, email)
    if (pending) throw new Error('PROFILE_SHARE_ALREADY_PENDING')

    const expiresAt = new Date(Date.now() + PROFILE_SHARE_TTL_DAYS * 24 * 60 * 60 * 1000)
    const token = generateToken()

    const { rows } = await this.pool.query(
      `INSERT INTO patient_profile_share_invites (
         patient_id, owner_account_id, target_account_email, token,
         legitimacy_ack, expires_at
       ) VALUES ($1, $2, $3, $4, true, $5)
       RETURNING id`,
      [input.patientId, input.ownerAccountId, email, token, expiresAt],
    )

    await this.audit?.record({
      patientId: input.patientId,
      actorAccountId: input.ownerAccountId,
      action: 'profile_share_sent',
    })

    const invite = await this.findById(rows[0].id as string)
    if (!invite) throw new Error('PROFILE_SHARE_NOT_FOUND')

    if (this.emails) {
      const settingsUrl = `${this.webBaseUrl.replace(/\/$/, '')}/settings/family`
      dispatchFamilyAccessEmail(async () => {
        await this.emails!.sendProfileShareInvite({
          targetEmail: email,
          ownerDisplayName: invite.ownerDisplayName,
          patientName: invite.patientName,
          settingsUrl,
        })
      })
    }

    return invite
  }

  async listSent(ownerAccountId: string) {
    const { rows } = await this.pool.query(
      `${INVITE_SELECT} WHERE i.owner_account_id = $1 ORDER BY i.created_at DESC LIMIT 50`,
      [ownerAccountId],
    )
    return rows.map((r) => mapInvite(r as Record<string, unknown>))
  }

  async listIncoming(accountId: string, accountEmail: string | null) {
    const email = accountEmail ? normalizeEmail(accountEmail) : null
    if (!email) return []

    const { rows } = await this.pool.query(
      `${INVITE_SELECT}
       WHERE lower(i.target_account_email) = $1
         AND i.status = 'pending'
         AND i.expires_at > NOW()
       ORDER BY i.created_at DESC`,
      [email],
    )
    return rows.map((r) => mapInvite(r as Record<string, unknown>))
  }

  async preview(token: string) {
    const invite = await this.findByToken(token)
    if (!invite || invite.status !== 'pending') return null
    if (invite.expiresAt.getTime() < Date.now()) return null
    return {
      patientName: invite.patientName,
      ownerDisplayName: invite.ownerDisplayName,
      targetAccountEmail: invite.targetAccountEmail,
      expiresAt: invite.expiresAt.toISOString(),
    }
  }

  async accept(input: AcceptProfileShareInput): Promise<PatientProfileShareInvite> {
    const invite = await this.findByToken(input.token)
    if (!invite) throw new Error('PROFILE_SHARE_NOT_FOUND')
    return this.completeAccept(invite, input.accountId, input.accountEmail, input.circleId)
  }

  async acceptById(
    inviteId: string,
    accountId: string,
    accountEmail: string | null,
    circleId: string,
  ): Promise<PatientProfileShareInvite> {
    const invite = await this.getIncomingInvite(accountId, accountEmail, inviteId)
    return this.completeAccept(invite, accountId, accountEmail, circleId)
  }

  private async completeAccept(
    invite: PatientProfileShareInvite,
    accountId: string,
    accountEmail: string | null,
    circleId: string,
  ): Promise<PatientProfileShareInvite> {
    if (invite.status !== 'pending') throw new Error('PROFILE_SHARE_NOT_PENDING')
    if (invite.expiresAt.getTime() < Date.now()) {
      await this.updateStatus(invite.id, 'revoked')
      throw new Error('PROFILE_SHARE_EXPIRED')
    }

    const email = accountEmail ? normalizeEmail(accountEmail) : null
    if (!email || email !== normalizeEmail(invite.targetAccountEmail)) {
      throw new Error('PROFILE_SHARE_EMAIL_MISMATCH')
    }

    await this.assertCircleManager(circleId, accountId)

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO patient_circle_links (patient_id, circle_id, link_kind, linked_by_account_id)
         VALUES ($1, $2, 'shared', $3)
         ON CONFLICT (patient_id, circle_id)
         DO UPDATE SET link_kind = 'shared', linked_by_account_id = EXCLUDED.linked_by_account_id`,
        [invite.patientId, circleId, accountId],
      )
      const { rows } = await client.query(
        `UPDATE patient_profile_share_invites
         SET status = 'accepted',
             target_circle_id = $2,
             accepted_at = NOW(),
             accepted_by_account_id = $3,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [invite.id, circleId, accountId],
      )
      await client.query('COMMIT')
      const updated = await this.findById(rows[0].id as string)
      if (!updated) throw new Error('PROFILE_SHARE_NOT_FOUND')

      await this.audit?.record({
        patientId: invite.patientId,
        actorAccountId: accountId,
        targetAccountId: invite.ownerAccountId,
        action: 'profile_share_accepted',
        careCircleId: circleId,
      })

      return updated
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  async decline(accountId: string, accountEmail: string | null, inviteId: string) {
    const invite = await this.getIncomingInvite(accountId, accountEmail, inviteId)
    await this.updateStatus(invite.id, 'declined')
  }

  async revoke(ownerAccountId: string, inviteId: string) {
    const invite = await this.findById(inviteId)
    if (!invite || invite.ownerAccountId !== ownerAccountId) {
      throw new Error('PROFILE_SHARE_NOT_FOUND')
    }
    if (invite.status === 'accepted' && invite.targetCircleId) {
      await this.pool.query(
        `DELETE FROM patient_circle_links
         WHERE patient_id = $1 AND circle_id = $2 AND link_kind = 'shared'`,
        [invite.patientId, invite.targetCircleId],
      )
    }
    await this.updateStatus(invite.id, 'revoked')
    await this.audit?.record({
      patientId: invite.patientId,
      actorAccountId: ownerAccountId,
      action: 'profile_share_revoked',
      careCircleId: invite.targetCircleId ?? undefined,
    })
  }

  private async getIncomingInvite(accountId: string, accountEmail: string | null, inviteId: string) {
    const rows = await this.listIncoming(accountId, accountEmail)
    const invite = rows.find((r) => r.id === inviteId)
    if (!invite) throw new Error('PROFILE_SHARE_NOT_FOUND')
    return invite
  }

  private async findById(id: string) {
    const { rows } = await this.pool.query(`${INVITE_SELECT} WHERE i.id = $1`, [id])
    return rows[0] ? mapInvite(rows[0] as Record<string, unknown>) : null
  }

  private async findByToken(token: string) {
    const { rows } = await this.pool.query(`${INVITE_SELECT} WHERE i.token = $1`, [token])
    return rows[0] ? mapInvite(rows[0] as Record<string, unknown>) : null
  }

  private async findPendingDuplicate(patientId: string, email: string) {
    const { rows } = await this.pool.query(
      `SELECT id FROM patient_profile_share_invites
       WHERE patient_id = $1 AND lower(target_account_email) = $2 AND status = 'pending'
         AND expires_at > NOW()
       LIMIT 1`,
      [patientId, email],
    )
    return rows[0]?.id ?? null
  }

  private async updateStatus(id: string, status: string) {
    await this.pool.query(
      `UPDATE patient_profile_share_invites SET status = $2, updated_at = NOW() WHERE id = $1`,
      [id, status],
    )
  }

  private async assertOwnsPatient(patientId: string, accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT owner_account_id::text AS owner FROM patients WHERE id = $1`,
      [patientId],
    )
    if (!rows[0] || rows[0].owner !== accountId) {
      throw new Error('PATIENT_ACCESS_FORBIDDEN')
    }
  }

  private async assertCircleManager(circleId: string, accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT role FROM care_circle_members WHERE circle_id = $1 AND account_id = $2`,
      [circleId, accountId],
    )
    const role = rows[0]?.role as string | undefined
    if (!role || (role !== 'owner' && role !== 'admin')) {
      throw new Error('CARE_CIRCLE_FORBIDDEN')
    }
  }

  private async getAccountEmail(accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT lower(email) AS email FROM app_accounts WHERE id = $1`,
      [accountId],
    )
    return rows[0]?.email ? String(rows[0].email) : null
  }
}
