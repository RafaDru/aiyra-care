import { afterEach, describe, expect, it, vi } from 'vitest'
import { completeProfileSchema } from '../src/infrastructure/http/auth/auth.schema.js'
import {
  createPatientSchema,
  updatePatientSchema,
} from '../src/infrastructure/http/patient/patient.schema.js'

const fixedNow = new Date('2026-10-08T12:00:00Z')

const baseCreate = {
  name: 'Joana de Maria',
  gender: 'female' as const,
}

const baseComplete = {
  ...baseCreate,
  cpf: '12345678901',
}

describe('patient birthDate schema', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('createPatientSchema rejeita data no futuro', () => {
    vi.useFakeTimers({ now: fixedNow })
    const result = createPatientSchema.safeParse({
      ...baseCreate,
      birthDate: '2027-06-15',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((i) => i.path.includes('birthDate'))).toBe(true)
    expect(result.error.issues[0]?.message).toMatch(/futuro/i)
  })

  it('createPatientSchema rejeita ano anterior a 1900', () => {
    vi.useFakeTimers({ now: fixedNow })
    const result = createPatientSchema.safeParse({
      ...baseCreate,
      birthDate: '1899-12-31',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0]?.message).toMatch(/1900/)
  })

  it('createPatientSchema aceita data válida', () => {
    vi.useFakeTimers({ now: fixedNow })
    const result = createPatientSchema.safeParse({
      ...baseCreate,
      birthDate: '1990-03-15',
    })
    expect(result.success).toBe(true)
  })

  it('updatePatientSchema rejeita data no futuro', () => {
    vi.useFakeTimers({ now: fixedNow })
    const result = updatePatientSchema.safeParse({ birthDate: '2028-01-01' })
    expect(result.success).toBe(false)
  })

  it('completeProfileSchema rejeita titular com nascimento futuro', () => {
    vi.useFakeTimers({ now: fixedNow })
    const result = completeProfileSchema.safeParse({
      ...baseComplete,
      birthDate: '2027-01-01',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    const messages = result.error.issues.map((i) => i.message)
    expect(messages.some((m) => /futuro/i.test(m))).toBe(true)
  })
})
