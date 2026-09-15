import type { OrganizationMemberRole } from './organization.entity.js'

export type OrganizationPermission = 'view' | 'manage_members' | 'manage_org'

const ROLE_PERMISSIONS: Record<OrganizationMemberRole, ReadonlySet<OrganizationPermission>> = {
  admin: new Set(['view', 'manage_members', 'manage_org']),
  clinician: new Set(['view']),
  read_only: new Set(['view']),
}

export function organizationRoleAllows(
  role: OrganizationMemberRole,
  permission: OrganizationPermission,
): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false
}

export function assertOrganizationPermission(
  role: OrganizationMemberRole,
  permission: OrganizationPermission,
): void {
  if (!organizationRoleAllows(role, permission)) {
    throw new Error('ORGANIZATION_FORBIDDEN')
  }
}
