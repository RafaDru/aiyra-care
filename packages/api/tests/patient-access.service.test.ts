import { describe, expect, it } from 'vitest'
import {
  MAX_FULL_GUARDIAN_GRANTS,
  PatientAccessService,
} from '../src/application/patient-access/patient-access.service.js'
import type { PatientAccessGrantRepository } from '../src/domain/patient-access/patient-access.repository.js'
import type { PatientMembershipRepository } from '../src/domain/auth/app-account.repository.js'
import type { PatientAccessGrantData, PatientAccessLevel, PatientMembershipRole } from '../src/domain/patient-access/patient-access.types.js'

class InMemoryGrantRepo implements PatientAccessGrantRepository {
  grants: PatientAccessGrantData[] = []

  async listActiveForPatient(patientId: string) {
    return this.grants.filter((g) => g.patientId === patientId && !g.revokedAt)
  }

  async listAccessiblePatientIds(accountId: string) {
    return [
      ...new Set(
        this.grants.filter((g) => g.accountId === accountId && !g.revokedAt).map((g) => g.patientId),
      ),
    ]
  }

  async findActive(patientId: string, accountId: string) {
    return this.grants.find((g) => g.patientId === patientId && g.accountId === accountId && !g.revokedAt) ?? null
  }

  async findById(grantId: string) {
    return this.grants.find((g) => g.id === grantId) ?? null
  }

  async upsertActive(input: {
    patientId: string
    accountId: string
    accessLevel: PatientAccessLevel
    membershipRole: PatientMembershipRole
    grantedBy: string | null
  }) {
    const existing = this.grants.find(
      (g) => g.patientId === input.patientId && g.accountId === input.accountId,
    )
    if (existing) {
      existing.accessLevel = input.accessLevel
      existing.membershipRole = input.membershipRole
      existing.grantedBy = input.grantedBy
      existing.revokedAt = null
      existing.updatedAt = new Date()
      return existing
    }
    const grant: PatientAccessGrantData = {
      id: crypto.randomUUID(),
      patientId: input.patientId,
      accountId: input.accountId,
      accessLevel: input.accessLevel,
      membershipRole: input.membershipRole,
      grantedBy: input.grantedBy,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.grants.push(grant)
    return grant
  }

  async revoke(grantId: string) {
    const grant = this.grants.find((g) => g.id === grantId && !g.revokedAt)
    if (!grant) return false
    grant.revokedAt = new Date()
    return true
  }

  async countActiveFullGrants(patientId: string) {
    return this.grants.filter(
      (g) =>
        g.patientId === patientId &&
        !g.revokedAt &&
        g.accessLevel === 'full' &&
        g.membershipRole !== 'self',
    ).length
  }
}

class InMemoryMemberships implements PatientMembershipRepository {
  rows: Array<{ accountId: string; patientId: string; role: string }> = []

  async hasSelfProfile() {
    return false
  }

  async ensureMembership(accountId: string, patientId: string, role = 'guardian') {
    if (!this.rows.some((r) => r.accountId === accountId && r.patientId === patientId)) {
      this.rows.push({ accountId, patientId, role })
    }
  }

  async listAccessiblePatientIds(accountId: string) {
    return this.rows.filter((r) => r.accountId === accountId).map((r) => r.patientId)
  }

  async listRolesForAccount() {
    return {}
  }

  async setSelfPatient() {}
}

class FakePool {
  owners = new Map<string, string>()

  async query(sql: string, params?: unknown[]) {
    if (sql.includes('owner_account_id') && params?.[0]) {
      return { rows: [{ owner_account_id: this.owners.get(params[0] as string) ?? null }] }
    }
    if (sql.includes('DELETE FROM patient_memberships')) {
      return { rowCount: 1 }
    }
    return { rows: [] }
  }
}

describe('PatientAccessService', () => {
  const patientId = '11111111-1111-1111-1111-111111111111'
  const ownerId = '22222222-2222-2222-2222-222222222222'
  const otherId = '33333333-3333-3333-3333-333333333333'

  function setup() {
    const grants = new InMemoryGrantRepo()
    const memberships = new InMemoryMemberships()
    const pool = new FakePool()
    pool.owners.set(patientId, ownerId)
    grants.grants.push({
      id: crypto.randomUUID(),
      patientId,
      accountId: ownerId,
      accessLevel: 'full',
      membershipRole: 'self',
      grantedBy: ownerId,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const service = new PatientAccessService(grants, memberships, pool as never)
    return { service, grants, memberships }
  }

  it('owner pode conceder acesso a outra conta', async () => {
    const { service } = setup()
    const grant = await service.grantAccess({
      patientId,
      actorAccountId: ownerId,
      targetAccountId: otherId,
      accessLevel: 'read_only',
    })
    expect(grant.accountId).toBe(otherId)
    expect(grant.accessLevel).toBe('read_only')
  })

  it('não-owner não pode conceder acesso', async () => {
    const { service } = setup()
    await expect(
      service.grantAccess({
        patientId,
        actorAccountId: otherId,
        targetAccountId: ownerId,
      }),
    ).rejects.toThrow('PATIENT_ACCESS_FORBIDDEN')
  })

  it(`bloqueia mais de ${MAX_FULL_GUARDIAN_GRANTS} cuidadores com acesso total`, async () => {
    const { service, grants } = setup()
    const g1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const g2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const g3 = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

    await service.grantAccess({ patientId, actorAccountId: ownerId, targetAccountId: g1 })
    await service.grantAccess({ patientId, actorAccountId: ownerId, targetAccountId: g2 })

    await expect(
      service.grantAccess({ patientId, actorAccountId: ownerId, targetAccountId: g3 }),
    ).rejects.toThrow('PATIENT_ACCESS_ADMIN_LIMIT')

    expect(await grants.countActiveFullGrants(patientId)).toBe(2)
  })

  it('não revoga grant self', async () => {
    const { service, grants } = setup()
    const selfGrant = await grants.upsertActive({
      patientId,
      accountId: ownerId,
      accessLevel: 'full',
      membershipRole: 'self',
      grantedBy: ownerId,
    })
    await expect(
      service.revokeGrant(patientId, selfGrant.id, ownerId),
    ).rejects.toThrow('PATIENT_ACCESS_CANNOT_REVOKE_SELF')
  })
})
