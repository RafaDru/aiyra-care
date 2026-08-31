import { describe, expect, it } from 'vitest'
import {
  hermesPardiniMagentoLoginUrl,
  hermesPardiniPortalEntryUrl,
  fleuryPrecisionUnifiedEntryUrl,
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
})
