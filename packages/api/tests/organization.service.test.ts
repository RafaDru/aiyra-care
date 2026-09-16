import { describe, expect, it } from 'vitest'
import { OrganizationService } from '../src/application/organization/organization.service.js'
import type { OrganizationRepository, OrganizationMemberData } from '../src/domain/organization/organization.repository.js'
import type { OrganizationData, OrganizationKind, OrganizationMemberRole } from '../src/domain/organization/organization.entity.js'

class InMemoryOrgRepo implements OrganizationRepository {
  orgs = new Map<string, OrganizationData>()
  members: OrganizationMemberData[] = []

  async create(name: string, kind: OrganizationKind) {
    const org: OrganizationData = {
      id: crypto.randomUUID(),
      name,
      kind,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.orgs.set(org.id, org)
    return org
  }

  async findById(id: string) {
    return this.orgs.get(id) ?? null
  }

  async update(id: string, patch: { name?: string; kind?: OrganizationKind }) {
    const existing = this.orgs.get(id)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: new Date() }
    this.orgs.set(id, updated)
    return updated
  }

  async delete(id: string) {
    const ok = this.orgs.delete(id)
    if (ok) this.members = this.members.filter((m) => m.organizationId !== id)
    return ok
  }

  async listForAccount(accountId: string) {
    const orgIds = new Set(
      this.members.filter((m) => m.accountId === accountId).map((m) => m.organizationId),
    )
    return [...orgIds].map((id) => this.orgs.get(id)!).filter(Boolean)
  }

  async addMember(organizationId: string, accountId: string, role: OrganizationMemberRole) {
    const member: OrganizationMemberData = {
      id: crypto.randomUUID(),
      organizationId,
      accountId,
      role,
      createdAt: new Date(),
    }
    this.members.push(member)
    return member
  }

  async listMembers(organizationId: string) {
    return this.members.filter((m) => m.organizationId === organizationId)
  }

  async findMember(organizationId: string, accountId: string) {
    return this.members.find((m) => m.organizationId === organizationId && m.accountId === accountId) ?? null
  }

  async updateMemberRole(memberId: string, role: OrganizationMemberRole) {
    const member = this.members.find((m) => m.id === memberId)
    if (!member) return null
    member.role = role
    return member
  }

  async removeMember(memberId: string) {
    const before = this.members.length
    this.members = this.members.filter((m) => m.id !== memberId)
    return this.members.length < before
  }
}

describe('OrganizationService', () => {
  it('creates org and adds creator as admin', async () => {
    const repo = new InMemoryOrgRepo()
    const service = new OrganizationService(repo)
    const org = await service.create('admin-1', 'Clínica Teste', 'clinic')
    expect(org.name).toBe('Clínica Teste')
    const listed = await service.listForAccount('admin-1')
    expect(listed).toHaveLength(1)
    const members = await service.listMembers(org.id, 'admin-1')
    expect(members[0].role).toBe('admin')
  })

  it('forbids non-member access', async () => {
    const repo = new InMemoryOrgRepo()
    const service = new OrganizationService(repo)
    const org = await service.create('admin-1', 'Lab', 'lab')
    await expect(service.getForMember(org.id, 'other')).rejects.toThrow('ORGANIZATION_FORBIDDEN')
  })

  it('prevents removing last admin', async () => {
    const repo = new InMemoryOrgRepo()
    const service = new OrganizationService(repo)
    const org = await service.create('admin-1', 'Farmácia', 'pharmacy')
    const members = await service.listMembers(org.id, 'admin-1')
    await expect(service.removeMember(org.id, 'admin-1', members[0].id)).rejects.toThrow('ORGANIZATION_LAST_ADMIN')
  })
})
