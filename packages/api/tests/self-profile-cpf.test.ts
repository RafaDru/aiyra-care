import { describe, it, expect } from 'vitest'
import { createPatientSchema } from '../src/infrastructure/http/patient/patient.schema.js'
import { isValidSelfProfileCpf } from '../src/domain/patient/self-profile-cpf.js'

describe('isValidSelfProfileCpf', () => {
  it('accepts 11-digit CPF', () => {
    expect(isValidSelfProfileCpf('12345678901')).toBe(true)
  })

  it('rejects null, empty, or short values', () => {
    expect(isValidSelfProfileCpf(null)).toBe(false)
    expect(isValidSelfProfileCpf(undefined)).toBe(false)
    expect(isValidSelfProfileCpf('')).toBe(false)
    expect(isValidSelfProfileCpf('123')).toBe(false)
  })
})

describe('createPatientSchema markAsSelf', () => {
  it('requires CPF when marking adult patient as self', () => {
    const parsed = createPatientSchema.safeParse({
      name: 'Titular',
      birthDate: '1990-01-01',
      markAsSelf: true,
    })
    expect(parsed.success).toBe(false)
  })

  it('allows dependent without CPF', () => {
    const parsed = createPatientSchema.safeParse({
      name: 'Filho',
      birthDate: '2020-01-01',
      markAsSelf: false,
    })
    expect(parsed.success).toBe(true)
  })
})
