import type { OrganizationData, OrganizationKind, OrganizationMemberRole } from './organization.entity.js'

export interface OrganizationMemberData {
  id: string
  organizationId: string
  accountId: string
  role: OrganizationMemberRole
  createdAt: Date
}

export interface OrganizationRepository {
  create(name: string, kind: OrganizationKind): Promise<OrganizationData>
  findById(id: string): Promise<OrganizationData | null>
  update(id: string, patch: { name?: string; kind?: OrganizationKind }): Promise<OrganizationData | null>
  delete(id: string): Promise<boolean>
  listForAccount(accountId: string): Promise<OrganizationData[]>
  addMember(organizationId: string, accountId: string, role: OrganizationMemberRole): Promise<OrganizationMemberData>
  listMembers(organizationId: string): Promise<OrganizationMemberData[]>
  findMember(organizationId: string, accountId: string): Promise<OrganizationMemberData | null>
  updateMemberRole(memberId: string, role: OrganizationMemberRole): Promise<OrganizationMemberData | null>
  removeMember(memberId: string): Promise<boolean>
}
