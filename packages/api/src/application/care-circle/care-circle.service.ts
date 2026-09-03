import type { Pool } from 'pg'
import type { CareCircleRepository } from '../../domain/care-circle/care-circle.repository.js'
import type { CareCircleMemberRole } from '../../domain/care-circle/care-circle.types.js'

export const MAX_CIRCLE_ADMINS = 2

export class CareCircleService {
  constructor(
    private readonly repo: CareCircleRepository,
    private readonly pool: Pool,
  ) {}

  listForAccount(accountId: string) {
    return this.repo.listForAccount(accountId)
  }

  dashboardGroups(accountId: string) {
    return this.repo.listDashboardGroups(accountId)
  }

  create(accountId: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('CARE_CIRCLE_NAME_REQUIRED')
    return this.repo.create(trimmed, accountId)
  }

  async getDetail(circleId: string, accountId: string) {
    const detail = await this.repo.getDetail(circleId, accountId)
    if (!detail) throw new Error('CARE_CIRCLE_FORBIDDEN')
    return detail
  }

  async updateName(circleId: string, accountId: string, name: string) {
    await this.requireOwnerOrAdmin(circleId, accountId)
    const updated = await this.repo.updateName(circleId, name)
    if (!updated) throw new Error('CARE_CIRCLE_NOT_FOUND')
    return updated
  }

  async listMembers(circleId: string, accountId: string) {
    await this.requireMember(circleId, accountId)
    return this.repo.listMembers(circleId)
  }

  async addMember(circleId: string, actorId: string, targetAccountId: string, role: CareCircleMemberRole) {
    await this.requireOwnerOrAdmin(circleId, actorId)
    if (role === 'owner') throw new Error('CARE_CIRCLE_INVALID_ROLE')
    const circle = await this.repo.findById(circleId)
    if (!circle) throw new Error('CARE_CIRCLE_NOT_FOUND')
    if (role === 'admin' && (await this.repo.countAdmins(circleId)) >= MAX_CIRCLE_ADMINS) {
      const existing = await this.repo.findMember(circleId, targetAccountId)
      if (!existing || existing.role !== 'admin') {
        throw new Error('CARE_CIRCLE_ADMIN_LIMIT')
      }
    }
    return this.repo.addMember(circleId, targetAccountId, role)
  }

  async removeMember(circleId: string, actorId: string, memberId: string) {
    await this.requireOwnerOrAdmin(circleId, actorId)
    const members = await this.repo.listMembers(circleId)
    const target = members.find((m) => m.id === memberId)
    if (!target) throw new Error('CARE_CIRCLE_MEMBER_NOT_FOUND')
    if (target.role === 'owner') throw new Error('CARE_CIRCLE_CANNOT_REMOVE_OWNER')
    const ok = await this.repo.removeMember(memberId)
    if (!ok) throw new Error('CARE_CIRCLE_MEMBER_NOT_FOUND')
  }

  async linkPatient(circleId: string, actorId: string, patientId: string) {
    await this.requireOwnerOrAdmin(circleId, actorId)
    const circle = await this.repo.findById(circleId)
    if (!circle) throw new Error('CARE_CIRCLE_NOT_FOUND')
    const { rows } = await this.pool.query(
      `SELECT owner_account_id::text AS owner FROM patients WHERE id = $1`,
      [patientId],
    )
    const owner = rows[0]?.owner as string | null
    if (!owner) throw new Error('CARE_CIRCLE_PATIENT_NOT_FOUND')
    if (owner !== circle.billingOwnerAccountId) {
      throw new Error('CARE_CIRCLE_PATIENT_NOT_OWNED')
    }
    await this.repo.linkPatient(circleId, patientId)
  }

  async unlinkPatient(circleId: string, actorId: string, patientId: string) {
    await this.requireOwnerOrAdmin(circleId, actorId)
    const ok = await this.repo.unlinkPatient(circleId, patientId)
    if (!ok) throw new Error('CARE_CIRCLE_PATIENT_NOT_FOUND')
  }

  async listLinkablePatients(circleId: string, accountId: string) {
    const circle = await this.repo.findById(circleId)
    if (!circle) throw new Error('CARE_CIRCLE_NOT_FOUND')
    await this.requireOwnerOrAdmin(circleId, accountId)
    const { rows } = await this.pool.query(
      `SELECT p.id::text AS id, p.name
       FROM patients p
       WHERE p.owner_account_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM patient_circle_links l
           WHERE l.patient_id = p.id AND l.circle_id = $2
         )
       ORDER BY p.name`,
      [circle.billingOwnerAccountId, circleId],
    )
    return rows as Array<{ id: string; name: string }>
  }

  private async requireMember(circleId: string, accountId: string) {
    const m = await this.repo.findMember(circleId, accountId)
    if (!m) throw new Error('CARE_CIRCLE_FORBIDDEN')
    return m
  }

  private async requireOwnerOrAdmin(circleId: string, accountId: string) {
    const m = await this.requireMember(circleId, accountId)
    if (m.role !== 'owner' && m.role !== 'admin') throw new Error('CARE_CIRCLE_FORBIDDEN')
    return m
  }
}
