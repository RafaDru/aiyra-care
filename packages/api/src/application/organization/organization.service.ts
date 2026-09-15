import type { OrganizationKind, OrganizationMemberRole } from '../../domain/organization/organization.entity.js'
import { assertOrganizationPermission } from '../../domain/organization/organization-rbac.js'
import type { OrganizationRepository } from '../../domain/organization/organization.repository.js'
import type { OrganizationAccessAuditService } from './organization-access-audit.service.js'

export class OrganizationService {
  constructor(
    private readonly repo: OrganizationRepository,
    private readonly audit?: OrganizationAccessAuditService,
  ) {}

  async listForAccount(accountId: string) {
    return this.repo.listForAccount(accountId)
  }

  async create(accountId: string, name: string, kind: OrganizationKind) {
    const org = await this.repo.create(name, kind)
    await this.repo.addMember(org.id, accountId, 'admin')
    return org
  }

  async getForMember(orgId: string, accountId: string) {
    const member = await this.requirePermission(orgId, accountId, 'view')
    const org = await this.repo.findById(orgId)
    if (!org) throw new Error('ORGANIZATION_NOT_FOUND')
    await this.audit?.record({
      organizationId: orgId,
      actorAccountId: accountId,
      action: 'org.view',
    })
    return { org, member }
  }

  async update(orgId: string, accountId: string, patch: { name?: string; kind?: OrganizationKind }) {
    await this.requirePermission(orgId, accountId, 'manage_org')
    const updated = await this.repo.update(orgId, patch)
    if (!updated) throw new Error('ORGANIZATION_NOT_FOUND')
    await this.audit?.record({
      organizationId: orgId,
      actorAccountId: accountId,
      action: 'org.update',
      metadata: { fields: Object.keys(patch) },
    })
    return updated
  }

  async delete(orgId: string, accountId: string) {
    await this.requirePermission(orgId, accountId, 'manage_org')
    const ok = await this.repo.delete(orgId)
    if (!ok) throw new Error('ORGANIZATION_NOT_FOUND')
    await this.audit?.record({
      organizationId: orgId,
      actorAccountId: accountId,
      action: 'org.delete',
    })
  }

  async listMembers(orgId: string, accountId: string) {
    await this.requirePermission(orgId, accountId, 'view')
    const members = await this.repo.listMembers(orgId)
    await this.audit?.record({
      organizationId: orgId,
      actorAccountId: accountId,
      action: 'org.members.list',
      metadata: { count: members.length },
    })
    return members
  }

  async addMember(orgId: string, actorId: string, targetAccountId: string, role: OrganizationMemberRole) {
    await this.requirePermission(orgId, actorId, 'manage_members')
    const member = await this.repo.addMember(orgId, targetAccountId, role)
    await this.audit?.record({
      organizationId: orgId,
      actorAccountId: actorId,
      action: 'org.member.add',
      targetAccountId,
      metadata: { role },
    })
    return member
  }

  async updateMemberRole(orgId: string, actorId: string, memberId: string, role: OrganizationMemberRole) {
    await this.requirePermission(orgId, actorId, 'manage_members')
    const updated = await this.repo.updateMemberRole(memberId, role)
    if (!updated || updated.organizationId !== orgId) throw new Error('ORGANIZATION_MEMBER_NOT_FOUND')
    await this.audit?.record({
      organizationId: orgId,
      actorAccountId: actorId,
      action: 'org.member.update',
      targetAccountId: updated.accountId,
      metadata: { role },
    })
    return updated
  }

  async removeMember(orgId: string, actorId: string, memberId: string) {
    await this.requirePermission(orgId, actorId, 'manage_members')
    const members = await this.repo.listMembers(orgId)
    const target = members.find((m) => m.id === memberId)
    if (!target) throw new Error('ORGANIZATION_MEMBER_NOT_FOUND')
    const admins = members.filter((m) => m.role === 'admin')
    if (target.role === 'admin' && admins.length <= 1) throw new Error('ORGANIZATION_LAST_ADMIN')
    const ok = await this.repo.removeMember(memberId)
    if (!ok) throw new Error('ORGANIZATION_MEMBER_NOT_FOUND')
    await this.audit?.record({
      organizationId: orgId,
      actorAccountId: actorId,
      action: 'org.member.remove',
      targetAccountId: target.accountId,
    })
  }

  async listAccessAudit(orgId: string, accountId: string, limit = 50) {
    await this.requirePermission(orgId, accountId, 'manage_org')
    if (!this.audit) return []
    const rows = await this.audit.listForOrganization(orgId, limit)
    await this.audit.record({
      organizationId: orgId,
      actorAccountId: accountId,
      action: 'org.audit.list',
      metadata: { limit },
    })
    return rows
  }

  private async requirePermission(
    orgId: string,
    accountId: string,
    permission: 'view' | 'manage_members' | 'manage_org',
  ) {
    const member = await this.repo.findMember(orgId, accountId)
    if (!member) throw new Error('ORGANIZATION_FORBIDDEN')
    assertOrganizationPermission(member.role, permission)
    return member
  }
}
