import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../src/application/auth/auth.service.js'
import { ConflictError } from '../src/domain/errors.js'
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

  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService(
      { verifyAccessToken: vi.fn() } as never,
      { findByAuthSubject: vi.fn(), save: vi.fn(), update: vi.fn() } as never,
      memberships as never,
      patients as never,
      measurements as never,
    )
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
