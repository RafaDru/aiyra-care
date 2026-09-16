import { describe, expect, it } from 'vitest'
import {
  appendReferralToShareUrl,
  generateReferralCode,
  isValidReferralCode,
} from '../src/domain/referral/referral-code.js'

describe('referral-code', () => {
  it('gera código alfanumérico de 8 caracteres', () => {
    const code = generateReferralCode()
    expect(code).toHaveLength(8)
    expect(isValidReferralCode(code)).toBe(true)
  })

  it('valida códigos entre 6 e 12 caracteres', () => {
    expect(isValidReferralCode('ABC123')).toBe(true)
    expect(isValidReferralCode('abc')).toBe(false)
    expect(isValidReferralCode('')).toBe(false)
    expect(isValidReferralCode(null)).toBe(false)
  })

  it('anexa ref na URL do share', () => {
    const url = appendReferralToShareUrl('http://localhost:5173/clinical-export/abc', 'REFCODE1')
    expect(url).toBe('http://localhost:5173/clinical-export/abc?ref=REFCODE1')
  })

  it('ignora ref inválido', () => {
    const base = 'http://localhost:5173/clinical-export/abc'
    expect(appendReferralToShareUrl(base, 'bad')).toBe(base)
    expect(appendReferralToShareUrl(base, null)).toBe(base)
  })
})
