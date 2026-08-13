import { describe, expect, it } from 'vitest'
import { isMinorBirthDate } from '../src/domain/patient/patient-age.js'

describe('isMinorBirthDate', () => {
  it('returns true for birth date 10 years ago', () => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 10)
    expect(isMinorBirthDate(d)).toBe(true)
  })

  it('returns false for birth date 25 years ago', () => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 25)
    expect(isMinorBirthDate(d)).toBe(false)
  })
})
