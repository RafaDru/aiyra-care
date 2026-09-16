import { describe, expect, it, vi } from 'vitest'
import { CareCircleService, MAX_CIRCLE_ADMINS } from '../src/application/care-circle/care-circle.service.js'
import type { CareCircleRepository } from '../src/domain/care-circle/care-circle.repository.js'
import type { CareCircleData, CareCircleMemberData } from '../src/domain/care-circle/care-circle.types.js'

class InMemoryCareCircleRepo implements CareCircleRepository {
  circles: CareCircleData[] = []
  members: CareCircleMemberData[] = []
  links: Array<{ patientId: string; circleId: string; name: string }> = []

  async create(name: string, billingOwnerAccountId: string) {
    const circle: CareCircleData = {
      id: crypto.randomUUID(),
      name,
      billingOwnerAccountId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.circles.push(circle)
    await this.addMember(circle.id, billingOwnerAccountId, 'owner')
    return circle
  }

  async findById(id: string) {
    return this.circles.find((c) => c.id === id) ?? null
  }

  async updateName(id: string, name: string) {
    const c = this.circles.find((x) => x.id === id)
    if (!c) return null
    c.name = name
    return c
  }

  async listForAccount(accountId: string) {
    const ids = new Set(this.members.filter((m) => m.accountId === accountId).map((m) => m.circleId))
    return this.circles
      .filter((c) => ids.has(c.id))
      .map((c) => ({
        ...c,
        memberRole: this.members.find((m) => m.circleId === c.id && m.accountId === accountId)?.role ?? 'member',
      }))
  }

  async listDashboardGroups(accountId: string) {
    const circles = await this.listForAccount(accountId)
    return circles.map((c) => ({
      id: c.id,
      name: c.name,
      memberRole: c.memberRole,
      patientIds: this.links.filter((l) => l.circleId === c.id).map((l) => l.patientId),
    }))
  }

  async findMember(circleId: string, accountId: string) {
    return this.members.find((m) => m.circleId === circleId && m.accountId === accountId) ?? null
  }

  async listMembers(circleId: string) {
    return this.members.filter((m) => m.circleId === circleId)
  }

  async addMember(circleId: string, accountId: string, role: CareCircleMemberData['role']) {
    const existing = this.members.find((m) => m.circleId === circleId && m.accountId === accountId)
    if (existing) {
      existing.role = role
      return existing
    }
    const member: CareCircleMemberData = {
      id: crypto.randomUUID(),
      circleId,
      accountId,
      role,
      createdAt: new Date(),
    }
    this.members.push(member)
    return member
  }

  async updateMemberRole(memberId: string, role: CareCircleMemberData['role']) {
    const m = this.members.find((x) => x.id === memberId)
    if (!m) return null
    m.role = role
    return m
  }

  async removeMember(memberId: string) {
    const before = this.members.length
    this.members = this.members.filter((m) => m.id !== memberId)
    return this.members.length < before
  }

  async countAdmins(circleId: string) {
    return this.members.filter((m) => m.circleId === circleId && m.role === 'admin').length
  }

  async listPatients(circleId: string) {
    return this.links
      .filter((l) => l.circleId === circleId)
      .map((l) => ({ patientId: l.patientId, patientName: l.name, circleId: l.circleId }))
  }

  async linkPatient(circleId: string, patientId: string) {
    if (!this.links.some((l) => l.circleId === circleId && l.patientId === patientId)) {
      this.links.push({ circleId, patientId, name: 'Paciente' })
    }
  }

  async unlinkPatient(circleId: string, patientId: string) {
    const before = this.links.length
    this.links = this.links.filter((l) => !(l.circleId === circleId && l.patientId === patientId))
    return this.links.length < before
  }

  async getDetail(circleId: string, accountId: string) {
    const member = await this.findMember(circleId, accountId)
    const circle = await this.findById(circleId)
    if (!member || !circle) return null
    return {
      circle,
      memberRole: member.role,
      members: await this.listMembers(circleId),
      patients: await this.listPatients(circleId),
    }
  }
}

class FakePool {
  patients = new Map<string, string>()

  async query(sql: string, params?: unknown[]) {
    if (sql.includes('owner_account_id') && params?.[0]) {
      return { rows: [{ owner: this.patients.get(params[0] as string) ?? null }] }
    }
    if (sql.includes('linkable')) {
      return { rows: [] }
    }
    return { rows: [] }
  }
}

describe('CareCircleService', () => {
  const ownerId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const adminId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

  it('cria círculo com owner', async () => {
    const repo = new InMemoryCareCircleRepo()
    const svc = new CareCircleService(repo, new FakePool() as never)
    const circle = await svc.create(ownerId, 'Família A')
    expect(circle.name).toBe('Família A')
    const detail = await svc.getDetail(circle.id, ownerId)
    expect(detail.memberRole).toBe('owner')
  })

  it(`limita ${MAX_CIRCLE_ADMINS} admins`, async () => {
    const repo = new InMemoryCareCircleRepo()
    const svc = new CareCircleService(repo, new FakePool() as never)
    const circle = await svc.create(ownerId, 'Família')
    const c3 = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    const d4 = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    await svc.addMember(circle.id, ownerId, adminId, 'admin')
    await svc.addMember(circle.id, ownerId, c3, 'admin')
    await expect(svc.addMember(circle.id, ownerId, d4, 'admin')).rejects.toThrow('CARE_CIRCLE_ADMIN_LIMIT')
  })
})
