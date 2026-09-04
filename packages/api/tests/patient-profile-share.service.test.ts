import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PatientProfileShareService } from '../src/application/patient-access/patient-profile-share.service.js'

describe('PatientProfileShareService', () => {
  const ownerId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const franciscoId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const patientId = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  const circleB = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  const inviteId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'

  let pool: {
    query: ReturnType<typeof vi.fn>
    connect: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] }
        if (sql.includes('INSERT INTO patient_circle_links')) return { rows: [] }
        if (sql.includes('UPDATE patient_profile_share_invites')) {
          return { rows: [{ id: inviteId }] }
        }
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    pool = {
      query: vi.fn(),
      connect: vi.fn(async () => client),
    }
  })

  it('exige legitimidade ao criar compartilhamento', async () => {
    const svc = new PatientProfileShareService(pool as never)
    await expect(
      svc.create({
        patientId,
        ownerAccountId: ownerId,
        targetAccountEmail: 'francisco@example.com',
        legitimacyAck: false,
      }),
    ).rejects.toThrow('PROFILE_SHARE_LEGITIMACY_REQUIRED')
  })

  it('aceita convite e vincula perfil shared ao círculo', async () => {
    const token = 'a'.repeat(32)
    pool.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM patient_profile_share_invites i') && sql.includes('token')) {
        return {
          rows: [{
            id: inviteId,
            patient_id: patientId,
            patient_name: 'Mariana',
            owner_account_id: ownerId,
            owner_display_name: 'João',
            target_account_email: 'francisco@example.com',
            target_circle_id: null,
            target_circle_name: null,
            status: 'pending',
            token,
            legitimacy_ack: true,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            accepted_at: null,
            accepted_by_account_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
        }
      }
      if (sql.includes('care_circle_members')) return { rows: [{ role: 'owner' }] }
      if (sql.includes('FROM patient_profile_share_invites i') && params?.[0] === inviteId) {
        return {
          rows: [{
            id: inviteId,
            patient_id: patientId,
            patient_name: 'Mariana',
            owner_account_id: ownerId,
            owner_display_name: 'João',
            target_account_email: 'francisco@example.com',
            target_circle_id: circleB,
            target_circle_name: 'Família B',
            status: 'accepted',
            token,
            legitimacy_ack: true,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            accepted_at: new Date().toISOString(),
            accepted_by_account_id: franciscoId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
        }
      }
      return { rows: [] }
    })

    const svc = new PatientProfileShareService(pool as never)
    const result = await svc.accept({
      token,
      accountId: franciscoId,
      accountEmail: 'francisco@example.com',
      circleId: circleB,
    })
    expect(result.status).toBe('accepted')
    expect(result.targetCircleId).toBe(circleB)
  })
})
