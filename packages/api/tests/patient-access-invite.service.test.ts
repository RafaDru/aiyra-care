import { describe, expect, it, vi } from 'vitest'
import { PatientAccessInviteService } from '../src/application/patient-access/patient-access-invite.service.js'
import type { PatientAccessInviteRepository } from '../src/domain/patient-access/patient-access-invite.repository.js'
import type { PatientAccessInviteData } from '../src/domain/patient-access/patient-access-invite.types.js'
import type { PatientAccessGrantRepository } from '../src/domain/patient-access/patient-access.repository.js'
import { PatientAccessService } from '../src/application/patient-access/patient-access.service.js'
import type { PatientMembershipRepository } from '../src/domain/auth/app-account.repository.js'

class InMemoryInviteRepo implements PatientAccessInviteRepository {
  invites: PatientAccessInviteData[] = []

  async create(input) {
    const invite: PatientAccessInviteData = {
      id: crypto.randomUUID(),
      inviterAccountId: input.inviterAccountId,
      inviteeEmail: input.inviteeEmail.toLowerCase(),
      patientIds: input.patientIds,
      accessLevel: input.accessLevel,
      membershipRole: input.membershipRole,
      token: input.token,
      legitimacyAck: input.legitimacyAck,
      status: 'pending',
      expiresAt: input.expiresAt,
      acceptedAt: null,
      acceptedByAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.invites.push(invite)
    return invite
  }

  async findById(id: string) {
    return this.invites.find((i) => i.id === id) ?? null
  }

  async findByToken(token: string) {
    return this.invites.find((i) => i.token === token) ?? null
  }

  async listByInviter(inviterAccountId: string) {
    return this.invites.filter((i) => i.inviterAccountId === inviterAccountId)
  }

  async listPendingForEmail(email: string) {
    return this.invites.filter(
      (i) => i.inviteeEmail === email.toLowerCase() && i.status === 'pending',
    )
  }

  async updateStatus(id, status, acceptedByAccountId?) {
    const invite = this.invites.find((i) => i.id === id)
    if (!invite) return null
    invite.status = status
    if (status === 'accepted') {
      invite.acceptedAt = new Date()
      invite.acceptedByAccountId = acceptedByAccountId ?? null
    }
    return invite
  }

  async getPreview(token: string) {
    const invite = await this.findByToken(token)
    if (!invite) return null
    return {
      inviteeEmail: invite.inviteeEmail,
      patientNames: ['Lucas'],
      inviterDisplayName: 'João',
      accessLevel: invite.accessLevel,
      status: invite.status,
      expiresAt: invite.expiresAt,
    }
  }
}

class FakePool {
  owners = new Map<string, string>()

  async query(sql: string, params?: unknown[]) {
    if (sql.includes('owner_account_id') && params?.[0]) {
      return { rows: [{ owner_account_id: this.owners.get(params[0] as string) ?? null }] }
    }
    return { rows: [] }
  }
}

describe('PatientAccessInviteService', () => {
  const ownerId = '22222222-2222-2222-2222-222222222222'
  const inviteeId = '33333333-3333-3333-3333-333333333333'
  const patientId = '11111111-1111-1111-1111-111111111111'

  function setup() {
    const invites = new InMemoryInviteRepo()
    const pool = new FakePool()
    pool.owners.set(patientId, ownerId)

    const grants = {
      listAccessiblePatientIds: vi.fn().mockResolvedValue([patientId]),
      listActiveForPatient: vi.fn().mockResolvedValue([]),
      findActive: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      upsertActive: vi.fn().mockImplementation(async (input) => ({
        id: crypto.randomUUID(),
        patientId: input.patientId,
        accountId: input.accountId,
        accessLevel: input.accessLevel,
        membershipRole: input.membershipRole,
        grantedBy: input.grantedBy,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      revoke: vi.fn(),
      countActiveFullGrants: vi.fn().mockResolvedValue(0),
    } satisfies PatientAccessGrantRepository

    const memberships = {
      ensureMembership: vi.fn().mockResolvedValue(undefined),
      hasSelfProfile: vi.fn(),
      listAccessiblePatientIds: vi.fn(),
      listRolesForAccount: vi.fn(),
      setSelfPatient: vi.fn(),
    } satisfies PatientMembershipRepository

    const access = new PatientAccessService(grants, memberships, pool as never)
    const service = new PatientAccessInviteService(
      invites,
      grants,
      access,
      pool as never,
      'http://localhost:5173',
    )
    return { service, invites }
  }

  it('cria convite com link de aceite', async () => {
    const { service } = setup()
    const { invite, acceptUrl } = await service.createInvite({
      inviterAccountId: ownerId,
      inviteeEmail: 'maria@example.com',
      patientIds: [patientId],
      legitimacyAck: true,
    })
    expect(invite.status).toBe('pending')
    expect(acceptUrl).toContain(invite.token)
  })

  it('aceita convite quando e-mail coincide', async () => {
    const { service, invites } = setup()
    const { invite } = await service.createInvite({
      inviterAccountId: ownerId,
      inviteeEmail: 'maria@example.com',
      patientIds: [patientId],
      legitimacyAck: true,
    })
    const accepted = await service.accept({
      token: invite.token,
      accountId: inviteeId,
      accountEmail: 'maria@example.com',
    })
    expect(accepted.status).toBe('accepted')
    expect(invites.invites[0].acceptedByAccountId).toBe(inviteeId)
  })

  it('rejeita e-mail diferente', async () => {
    const { service } = setup()
    const { invite } = await service.createInvite({
      inviterAccountId: ownerId,
      inviteeEmail: 'maria@example.com',
      patientIds: [patientId],
      legitimacyAck: true,
    })
    await expect(
      service.accept({
        token: invite.token,
        accountId: inviteeId,
        accountEmail: 'outro@example.com',
      }),
    ).rejects.toThrow('PATIENT_ACCESS_INVITE_EMAIL_MISMATCH')
  })
})
