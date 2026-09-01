import { describe, expect, it } from 'vitest'
import {
  hermesPardiniMagentoLoginUrl,
  hermesPardiniPortalEntryUrl,
  fleuryPrecisionUnifiedEntryUrl,
  fleuryPrecisionOtpTimeoutMs,
  hermesPardiniUseUnifiedLogin,
  FLEURY_PRECISION_MARCA_PROFILES,
  HERMES_PARDINI_PRECISION_CARE,
  resolveHermesPardiniRegion,
} from '../src/infrastructure/scraper/hermes-pardini.portal.js'

describe('hermes-pardini.portal', () => {
  it('points to Precision Care portal entry', () => {
    expect(hermesPardiniPortalEntryUrl()).toBe(
      'https://resultados.grupofleury.com.br/?origin=pardini',
    )
    expect(fleuryPrecisionUnifiedEntryUrl()).toBe('https://resultados.grupofleury.com.br')
    expect(HERMES_PARDINI_PRECISION_CARE.keycloak.clientId).toBe('precision_care_pardini')
    expect(HERMES_PARDINI_PRECISION_CARE.pacienteApiBase).toContain('/paciente/api/v1')
  })

  it('defines marca profiles for PoC', () => {
    expect(FLEURY_PRECISION_MARCA_PROFILES.pardini['marca-selecionada']).toBe('pardini')
    expect(FLEURY_PRECISION_MARCA_PROFILES.fleury.grupo).toBe('grupo-fleury')
  })

  it('keeps Magento regional URLs for legacy store', () => {
    expect(resolveHermesPardiniRegion()).toBe('mg')
    expect(hermesPardiniMagentoLoginUrl('mg')).toContain('/lojavirtual/customer/account/login/')
    expect(hermesPardiniMagentoLoginUrl('sp')).toContain('/lojavirtual-sp/customer/account/login/')
  })

  it('defaults unified OTP login on (opt-out with FLEURY_PRECISION_UNIFIED_LOGIN=0)', () => {
    const prev = process.env.FLEURY_PRECISION_UNIFIED_LOGIN
    delete process.env.FLEURY_PRECISION_UNIFIED_LOGIN
    expect(hermesPardiniUseUnifiedLogin()).toBe(true)
    process.env.FLEURY_PRECISION_UNIFIED_LOGIN = '0'
    expect(hermesPardiniUseUnifiedLogin()).toBe(false)
    if (prev !== undefined) process.env.FLEURY_PRECISION_UNIFIED_LOGIN = prev
    else delete process.env.FLEURY_PRECISION_UNIFIED_LOGIN
  })

  it('clamps OTP timeout', () => {
    expect(fleuryPrecisionOtpTimeoutMs()).toBe(180_000)
    process.env.FLEURY_PRECISION_OTP_TIMEOUT_MS = '240000'
    expect(fleuryPrecisionOtpTimeoutMs()).toBe(240_000)
    delete process.env.FLEURY_PRECISION_OTP_TIMEOUT_MS
  })
})
