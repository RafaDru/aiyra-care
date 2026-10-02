import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../src/application/auth/auth.service.js'
import { ConflictError } from '../src/domain/errors.js'
import { AppAccount } from '../src/domain/auth/app-account.entity.js'
import { Patient } from '../src/domain/patient/patient.entity.js'

function makePatient() {
  return Patient.create({
    name: 'Rafael',
    birthDate: new Date('1990-01-01'),
    gender: 'male',
    cpf: '12345678901',
    weightKg: 72,
    heightCm: 178,
  })
}

describe('AuthService.syncAccountFromToken', () => {
  const authProvider = { verifyAccessToken: vi.fn() }
  const memberships = {
    hasSelfProfile: vi.fn(async () => true),
    ensureMembership: vi.fn(),
    listAccessiblePatientIds: vi.fn(),
  }
  const patients = { create: vi.fn(), setOwnerAccountId: vi.fn() }
  const accounts = {
    findByAuthSubject: vi.fn(),
    findById: vi.fn(),
    save: vi.fn(),
    update: vi.fn(async (a: AppAccount) => a),
  }

  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService(
      authProvider as never,
      accounts as never,
      memberships as never,
      patients as never,
    )
  })

  it('keeps onboarding displayName when provider only sends email', async () => {
    const existing = AppAccount.create(
      { authSubject: 'sub-1', email: 'bruno@example.com', displayName: 'Bruno' },
      'account-1',
    )
    accounts.findByAuthSubject.mockResolvedValue(existing)
    authProvider.verifyAccessToken.mockResolvedValue({
      id: 'sub-1',
      email: 'bruno@example.com',
      displayName: 'bruno@example.com',
      avatarUrl: null,
    })

    const result = await service.syncAccountFromToken('token')

    expect(result?.account.displayName).toBe('Bruno')
    const saved = accounts.update.mock.calls[0]?.[0] as AppAccount
    expect(saved.displayName).toBe('Bruno')
  })
})

describe('AuthService.completeProfile', () => {
  const memberships = {
    hasSelfProfile: vi.fn(async () => false),
    ensureMembership: vi.fn(async () => undefined),
  }
  const patients = {
    create: vi.fn(async () => makePatient()),
    setOwnerAccountId: vi.fn(async () => undefined),
  }
  const measurements = {
    seedInitialAnthropometry: vi.fn(async () => []),
  }
  const accounts = {
    findByAuthSubject: vi.fn(),
    findById: vi.fn(async () =>
      AppAccount.create({ authSubject: 'sub-1', email: 'a@b.com', displayName: 'a@b.com' }, 'account-1'),
    ),
    save: vi.fn(),
    update: vi.fn(async (a: AppAccount) => a),
  }

  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService(
      { verifyAccessToken: vi.fn() } as never,
      accounts as never,
      memberships as never,
      patients as never,
      measurements as never,
    )
  })

  it('updates account displayName from profile name', async () => {
    await service.completeProfile('account-1', {
      name: 'Bruno',
      birthDate: new Date('1990-01-01'),
      gender: 'male',
      cpf: '12345678901',
    })

    expect(accounts.update).toHaveBeenCalled()
    const saved = accounts.update.mock.calls[0]?.[0] as AppAccount
    expect(saved.displayName).toBe('Bruno')
  })

  it('seeds anthropometry measurements when weight or height provided', async () => {
    const result = await service.completeProfile('account-1', {
      name: 'Rafael',
      birthDate: new Date('1990-01-01'),
      gender: 'male',
      cpf: '12345678901',
      weightKg: 72,
      heightCm: 178,
    })

    expect(result.needsProfile).toBe(false)
    expect(measurements.seedInitialAnthropometry).toHaveBeenCalledWith(
      result.patient.id,
      { weightKg: 72, heightCm: 178 },
    )
  })

  it('skips measurement seed when no anthropometry provided', async () => {
    await service.completeProfile('account-1', {
      name: 'Rafael',
      birthDate: new Date('1990-01-01'),
      gender: 'male',
      cpf: '12345678901',
    })

    expect(measurements.seedInitialAnthropometry).not.toHaveBeenCalled()
  })

  it('rejects duplicate profile completion', async () => {
    memberships.hasSelfProfile.mockResolvedValueOnce(true)

    await expect(service.completeProfile('account-1', {
      name: 'Rafael',
      birthDate: new Date('1990-01-01'),
      gender: 'male',
      cpf: '12345678901',
    })).rejects.toBeInstanceOf(ConflictError)
  })
})
