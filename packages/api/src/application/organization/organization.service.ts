import type { OrganizationKind, OrganizationMemberRole } from '../../domain/organization/organization.entity.js'
import type { OrganizationRepository } from '../../domain/organization/organization.repository.js'

export class OrganizationService {
  constructor(private readonly repo: OrganizationRepository) {}

  async listForAccount(accountId: string) {
    return this.repo.listForAccount(accountId)
  }

  async create(accountId: string, name: string, kind: OrganizationKind) {
    const org = await this.repo.create(name, kind)
    await this.repo.addMember(org.id, accountId, 'admin')
    return org
  }

  async getForMember(orgId: string, accountId: string) {
    const member = await this.repo.findMember(orgId, accountId)
    if (!member) throw new Error('ORGANIZATION_FORBIDDEN')
    const org = await this.repo.findById(orgId)
    if (!org) throw new Error('ORGANIZATION_NOT_FOUND')
    return { org, member }
  }

  async update(orgId: string, accountId: string, patch: { name?: string; kind?: OrganizationKind }) {
    const member = await this.requireAdmin(orgId, accountId)
    void member
    const updated = await this.repo.update(orgId, patch)
    if (!updated) throw new Error('ORGANIZATION_NOT_FOUND')
    return updated
  }

  async delete(orgId: string, accountId: string) {
    await this.requireAdmin(orgId, accountId)
    const ok = await this.repo.delete(orgId)
    if (!ok) throw new Error('ORGANIZATION_NOT_FOUND')
  }

  async listMembers(orgId: string, accountId: string) {
    await this.requireMember(orgId, accountId)
    return this.repo.listMembers(orgId)
  }

  async addMember(orgId: string, actorId: string, targetAccountId: string, role: OrganizationMemberRole) {
    await this.requireAdmin(orgId, actorId)
    return this.repo.addMember(orgId, targetAccountId, role)
  }

  async updateMemberRole(orgId: string, actorId: string, memberId: string, role: OrganizationMemberRole) {
    await this.requireAdmin(orgId, actorId)
    const updated = await this.repo.updateMemberRole(memberId, role)
    if (!updated || updated.organizationId !== orgId) throw new Error('ORGANIZATION_MEMBER_NOT_FOUND')
    return updated
  }

  async removeMember(orgId: string, actorId: string, memberId: string) {
    await this.requireAdmin(orgId, actorId)
    const members = await this.repo.listMembers(orgId)
    const target = members.find((m) => m.id === memberId)
    if (!target) throw new Error('ORGANIZATION_MEMBER_NOT_FOUND')
    const admins = members.filter((m) => m.role === 'admin')
    if (target.role === 'admin' && admins.length <= 1) throw new Error('ORGANIZATION_LAST_ADMIN')
    const ok = await this.repo.removeMember(memberId)
    if (!ok) throw new Error('ORGANIZATION_MEMBER_NOT_FOUND')
  }

  private async requireMember(orgId: string, accountId: string) {
    const member = await this.repo.findMember(orgId, accountId)
    if (!member) throw new Error('ORGANIZATION_FORBIDDEN')
    return member
  }

  private async requireAdmin(orgId: string, accountId: string) {
    const member = await this.requireMember(orgId, accountId)
    if (member.role !== 'admin') throw new Error('ORGANIZATION_FORBIDDEN')
    return member
  }
}
