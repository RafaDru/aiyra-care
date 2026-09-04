import type { Pool } from 'pg'
import type { PatientAccessInviteRepository } from '../../domain/patient-access/patient-access-invite.repository.js'
import type {
  PatientAccessInviteCircleRole,
  PatientAccessInviteData,
} from '../../domain/patient-access/patient-access-invite.types.js'
import type { PatientAccessGrantRepository } from '../../domain/patient-access/patient-access.repository.js'
import { PatientAccessService } from './patient-access.service.js'
import { generateInviteToken } from '../../infrastructure/persistence/patient-access-invite.pg.repository.js'
import type { PatientAccessLevel, PatientMembershipRole } from '../../domain/patient-access/patient-access.types.js'
import type { CareCircleService } from '../care-circle/care-circle.service.js'
import type { PatientAccessAuditService } from './patient-access-audit.service.js'

const INVITE_TTL_DAYS = 7

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export class PatientAccessInviteService {
  constructor(
    private readonly invites: PatientAccessInviteRepository,
    private readonly grants: PatientAccessGrantRepository,
    private readonly access: PatientAccessService,
    private readonly circles: CareCircleService,
    private readonly pool: Pool,
    private readonly webBaseUrl: string,
    private readonly audit?: PatientAccessAuditService,
  ) {}

  async createInvite(input: {
    inviterAccountId: string
    inviteeEmail: string
    patientIds: string[]
    accessLevel?: PatientAccessLevel
    membershipRole?: PatientMembershipRole
    careCircleId?: string
    circleRole?: PatientAccessInviteCircleRole
    legitimacyAck: boolean
  }): Promise<{ invite: PatientAccessInviteData; acceptUrl: string }> {
    if (!input.legitimacyAck) throw new Error('PATIENT_ACCESS_INVITE_LEGITIMACY_REQUIRED')
    if (!input.patientIds.length) throw new Error('PATIENT_ACCESS_INVITE_NO_PATIENTS')

    const email = normalizeEmail(input.inviteeEmail)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('PATIENT_ACCESS_INVITE_INVALID_EMAIL')
    }

    for (const patientId of input.patientIds) {
      await this.assertOwnsPatient(patientId, input.inviterAccountId)
    }

    const accessLevel = input.accessLevel ?? 'full'
    const membershipRole = input.membershipRole ?? 'guardian'
    if (membershipRole === 'self') throw new Error('PATIENT_ACCESS_INVALID_ROLE')

    let careCircleId = input.careCircleId ?? null
    const circleRole = input.circleRole ?? 'member'

    if (careCircleId) {
      await this.assertPatientsInCircle(careCircleId, input.inviterAccountId, input.patientIds)
    } else {
      careCircleId = await this.inferDefaultCircleId(input.inviterAccountId, input.patientIds)
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
    const token = generateInviteToken()

    const invite = await this.invites.create({
      inviterAccountId: input.inviterAccountId,
      inviteeEmail: email,
      patientIds: input.patientIds,
      accessLevel,
      membershipRole,
      careCircleId,
      circleRole,
      token,
      legitimacyAck: true,
      expiresAt,
    })

    const acceptUrl = `${this.webBaseUrl.replace(/\/$/, '')}/invite/accept?token=${token}`

    for (const patientId of input.patientIds) {
      await this.audit?.record({
        patientId,
        actorAccountId: input.inviterAccountId,
        action: 'invite_sent',
        accessLevel,
        membershipRole,
        careCircleId,
        inviteId: invite.id,
        patientCount: input.patientIds.length,
      })
    }

    return { invite, acceptUrl }
  }

  listSent(inviterAccountId: string) {
    return this.invites.listByInviter(inviterAccountId)
  }

  async listOwnedPatients(accountId: string, careCircleId?: string) {
    if (!careCircleId) {
      const { rows } = await this.pool.query(
        `SELECT id::text AS id, name FROM patients WHERE owner_account_id = $1 ORDER BY name`,
        [accountId],
      )
      return rows as Array<{ id: string; name: string }>
    }

    const detail = await this.circles.getDetail(careCircleId, accountId)
    return detail.patients.map((p) => ({ id: p.patientId, name: p.patientName }))
  }

  async revoke(inviterAccountId: string, inviteId: string) {
    const invite = await this.invites.findById(inviteId)
    if (!invite || invite.inviterAccountId !== inviterAccountId) {
      throw new Error('PATIENT_ACCESS_INVITE_NOT_FOUND')
    }
    if (invite.status !== 'pending') throw new Error('PATIENT_ACCESS_INVITE_NOT_PENDING')
    await this.invites.updateStatus(inviteId, 'revoked')
    for (const patientId of invite.patientIds) {
      await this.audit?.record({
        patientId,
        actorAccountId: inviterAccountId,
        action: 'invite_revoked',
        inviteId: invite.id,
        patientCount: invite.patientIds.length,
      })
    }
  }

  getPreview(token: string) {
    return this.invites.getPreview(token)
  }

  async accept(input: { token: string; accountId: string; accountEmail: string | null }) {
    const invite = await this.invites.findByToken(input.token)
    if (!invite) throw new Error('PATIENT_ACCESS_INVITE_NOT_FOUND')

    if (invite.status !== 'pending') throw new Error('PATIENT_ACCESS_INVITE_NOT_PENDING')
    if (invite.expiresAt.getTime() < Date.now()) {
      await this.invites.updateStatus(invite.id, 'expired')
      throw new Error('PATIENT_ACCESS_INVITE_EXPIRED')
    }

    const email = input.accountEmail ? normalizeEmail(input.accountEmail) : null
    if (!email || email !== normalizeEmail(invite.inviteeEmail)) {
      throw new Error('PATIENT_ACCESS_INVITE_EMAIL_MISMATCH')
    }

    if (invite.inviterAccountId === input.accountId) {
      throw new Error('PATIENT_ACCESS_INVITE_SELF')
    }

    for (const patientId of invite.patientIds) {
      await this.access.grantAccess({
        patientId,
        actorAccountId: invite.inviterAccountId,
        targetAccountId: input.accountId,
        accessLevel: invite.accessLevel,
        membershipRole: invite.membershipRole,
      })
    }

    if (invite.careCircleId) {
      await this.circles.addMember(
        invite.careCircleId,
        invite.inviterAccountId,
        input.accountId,
        invite.circleRole,
      )
    }

    const updated = await this.invites.updateStatus(invite.id, 'accepted', input.accountId)

    for (const patientId of invite.patientIds) {
      await this.audit?.record({
        patientId,
        actorAccountId: invite.inviterAccountId,
        targetAccountId: input.accountId,
        action: 'invite_accepted',
        accessLevel: invite.accessLevel,
        membershipRole: invite.membershipRole,
        careCircleId: invite.careCircleId,
        inviteId: invite.id,
        patientCount: invite.patientIds.length,
      })
    }

    return updated!
  }

  private async assertOwnsPatient(patientId: string, accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT owner_account_id::text AS owner_account_id FROM patients WHERE id = $1`,
      [patientId],
    )
    if (!rows[0] || rows[0].owner_account_id !== accountId) {
      throw new Error('PATIENT_ACCESS_FORBIDDEN')
    }
  }

  private async assertPatientsInCircle(
    circleId: string,
    actorId: string,
    patientIds: string[],
  ) {
    const detail = await this.circles.getDetail(circleId, actorId)
    if (detail.memberRole !== 'owner' && detail.memberRole !== 'admin') {
      throw new Error('CARE_CIRCLE_FORBIDDEN')
    }
    const linked = new Set(detail.patients.map((p) => p.patientId))
    for (const id of patientIds) {
      if (!linked.has(id)) throw new Error('CARE_CIRCLE_PATIENT_NOT_FOUND')
    }
  }

  private async inferDefaultCircleId(accountId: string, patientIds: string[]) {
    const circles = await this.circles.listForAccount(accountId)
    const manageable = circles.filter((c) => c.memberRole === 'owner' || c.memberRole === 'admin')
    for (const circle of manageable) {
      const detail = await this.circles.getDetail(circle.id, accountId)
      const linked = new Set(detail.patients.map((p) => p.patientId))
      if (patientIds.every((id) => linked.has(id))) return circle.id
    }
    return null
  }
}
