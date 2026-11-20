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
    findSelfPatientId: vi.fn(async () => 'patient-self-1'),
    ensureMembership: vi.fn(),
    listAccessiblePatientIds: vi.fn(),
  }
  const patients = {
    create: vi.fn(),
    findById: vi.fn(async () =>
      Patient.create({
        name: 'Bruno',
        birthDate: new Date('1990-01-01'),
        cpf: '12345678901',
      }, 'patient-self-1'),
    ),
    setOwnerAccountId: vi.fn(),
  }
  const accounts = {
    findByAuthSubject: vi.fn(),
    findById: vi.fn(),
    listByEmail: vi.fn(async () => [] as AppAccount[]),
    relinkAuthSubject: vi.fn(async (id: string, _p: string, sub: string) =>
      AppAccount.create({ authSubject: sub, email: 'jenifer@example.com', displayName: 'Jenifer' }, id),
    ),
    retireAuthSubject: vi.fn(async () => undefined),
    save: vi.fn(),
    update: vi.fn(async (a: AppAccount) => a),
  }
  const careCircles = {
    listForAccount: vi.fn(async () => [{ id: 'circle-1', name: 'Família' }]),
  }

  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService(
      authProvider as never,
      accounts as never,
      memberships as never,
      patients as never,
      undefined,
      undefined,
      careCircles as never,
    )
    memberships.listAccessiblePatientIds = vi.fn(async () => ['patient-self-1'])
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

  it('needsProfile stays true when self patient has no CPF', async () => {
    const existing = AppAccount.create(
      { authSubject: 'sub-1', email: 'legacy@example.com', displayName: 'Legacy' },
      'account-1',
    )
    accounts.findByAuthSubject.mockResolvedValue(existing)
    authProvider.verifyAccessToken.mockResolvedValue({
      id: 'sub-1',
      email: 'legacy@example.com',
      displayName: 'Legacy',
      avatarUrl: null,
    })
    memberships.findSelfPatientId.mockResolvedValue('patient-incomplete')
    patients.findById.mockResolvedValue(
      Patient.create({
        name: 'Legacy',
        birthDate: new Date('1990-01-01'),
        cpf: null,
      }, 'patient-incomplete'),
    )

    const result = await service.syncAccountFromToken('token')
    expect(result?.needsProfile).toBe(true)
    expect(result?.needsOnboardingSetup).toBe(false)
  })

  it('relinks OAuth subject to existing account with same email', async () => {
    const legacy = AppAccount.create(
      { authSubject: 'old-sub', email: 'jenifer@example.com', displayName: 'Jenifer' },
      'account-legacy',
    )
    accounts.findByAuthSubject.mockResolvedValue(null)
    accounts.listByEmail.mockResolvedValue([legacy])
    accounts.relinkAuthSubject.mockImplementation(async (id: string, _p: string, sub: string) =>
      AppAccount.restore({ ...legacy.toJSON(), id, authSubject: sub, updatedAt: new Date() }),
    )
    authProvider.verifyAccessToken.mockResolvedValue({
      id: 'google-sub-new',
      email: 'jenifer@example.com',
      displayName: 'Jenifer Google',
      avatarUrl: null,
    })
    patients.findById.mockResolvedValue(
      Patient.create({
        name: 'Jenifer',
        birthDate: new Date('1990-01-01'),
        cpf: '12345678901',
      }, 'patient-self-1'),
    )

    const result = await service.syncAccountFromToken('token')

    expect(accounts.save).not.toHaveBeenCalled()
    expect(accounts.relinkAuthSubject).toHaveBeenCalledWith(
      'account-legacy',
      'supabase',
      'google-sub-new',
    )
    expect(result?.account.id).toBe('account-legacy')
    expect(result?.needsProfile).toBe(false)
    expect(result?.isNew).toBe(false)
  })

  it('needsOnboardingSetup when profile ok but no care circle', async () => {
    const existing = AppAccount.create(
      { authSubject: 'sub-1', email: 'bruno@example.com', displayName: 'Bruno' },
      'account-1',
    )
    accounts.findByAuthSubject.mockResolvedValue(existing)
    authProvider.verifyAccessToken.mockResolvedValue({
      id: 'sub-1',
      email: 'bruno@example.com',
      displayName: 'Bruno',
      avatarUrl: null,
    })
    careCircles.listForAccount.mockResolvedValue([])
    patients.findById.mockResolvedValue(
      Patient.create({
        name: 'Bruno',
        birthDate: new Date('1990-01-01'),
        cpf: '12345678901',
      }, 'patient-self-1'),
    )

    const result = await service.syncAccountFromToken('token')
    expect(result?.needsProfile).toBe(false)
    expect(result?.needsOnboardingSetup).toBe(true)
  })
})

describe('AuthService.completeProfile', () => {
  const memberships = {
    hasSelfProfile: vi.fn(async () => false),
    findSelfPatientId: vi.fn(async () => null),
    ensureMembership: vi.fn(async () => undefined),
  }
  const patients = {
    create: vi.fn(async () => makePatient()),
    update: vi.fn(async () => makePatient()),
    findById: vi.fn(),
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
    listByEmail: vi.fn(async () => [] as AppAccount[]),
    relinkAuthSubject: vi.fn(),
    retireAuthSubject: vi.fn(),
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
    memberships.findSelfPatientId.mockResolvedValueOnce('patient-self-1')
    patients.findById.mockResolvedValueOnce(makePatient())

    await expect(service.completeProfile('account-1', {
      name: 'Rafael',
      birthDate: new Date('1990-01-01'),
      gender: 'male',
      cpf: '12345678901',
    })).rejects.toBeInstanceOf(ConflictError)
  })

  it('completes profile by updating self patient missing CPF', async () => {
    const incomplete = Patient.create({
      name: 'Legacy',
      birthDate: new Date('1990-01-01'),
      cpf: null,
    }, 'patient-incomplete')
    memberships.findSelfPatientId.mockResolvedValueOnce('patient-incomplete')
    patients.findById.mockResolvedValueOnce(incomplete)
    patients.update.mockResolvedValueOnce(makePatient())

    const result = await service.completeProfile('account-1', {
      name: 'Rafael',
      birthDate: new Date('1990-01-01'),
      gender: 'male',
      cpf: '12345678901',
    })

    expect(patients.update).toHaveBeenCalledWith('patient-incomplete', expect.objectContaining({ cpf: '12345678901' }))
    expect(patients.create).not.toHaveBeenCalled()
    expect(result.needsProfile).toBe(false)
  })
})
