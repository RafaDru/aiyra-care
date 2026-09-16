import { describe, expect, it } from 'vitest'
import {
  assertOrganizationPermission,
  organizationRoleAllows,
} from '../src/domain/organization/organization-rbac.js'

describe('organization-rbac', () => {
  it('admin tem todas as permissões', () => {
    expect(organizationRoleAllows('admin', 'view')).toBe(true)
    expect(organizationRoleAllows('admin', 'manage_members')).toBe(true)
    expect(organizationRoleAllows('admin', 'manage_org')).toBe(true)
  })

  it('clinician e read_only só visualizam', () => {
    expect(organizationRoleAllows('clinician', 'view')).toBe(true)
    expect(organizationRoleAllows('clinician', 'manage_members')).toBe(false)
    expect(organizationRoleAllows('read_only', 'view')).toBe(true)
    expect(organizationRoleAllows('read_only', 'manage_org')).toBe(false)
  })

  it('lança ORGANIZATION_FORBIDDEN quando sem permissão', () => {
    expect(() => assertOrganizationPermission('read_only', 'manage_members')).toThrow(
      'ORGANIZATION_FORBIDDEN',
    )
  })
})
