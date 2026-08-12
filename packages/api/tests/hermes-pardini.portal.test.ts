import { describe, expect, it } from 'vitest'
import {
  hermesPardiniMagentoLoginUrl,
  hermesPardiniPortalEntryUrl,
  HERMES_PARDINI_PRECISION_CARE,
  resolveHermesPardiniRegion,
} from '../src/infrastructure/scraper/hermes-pardini.portal.js'

describe('hermes-pardini.portal', () => {
  it('points to Precision Care portal entry', () => {
    expect(hermesPardiniPortalEntryUrl()).toBe(
      'https://resultados.grupofleury.com.br/?origin=pardini',
    )
    expect(HERMES_PARDINI_PRECISION_CARE.keycloak.clientId).toBe('precision_care_pardini')
    expect(HERMES_PARDINI_PRECISION_CARE.pacienteApiBase).toContain('/paciente/api/v1')
  })

  it('keeps Magento regional URLs for legacy store', () => {
    expect(resolveHermesPardiniRegion()).toBe('mg')
    expect(hermesPardiniMagentoLoginUrl('mg')).toContain('/lojavirtual/customer/account/login/')
    expect(hermesPardiniMagentoLoginUrl('sp')).toContain('/lojavirtual-sp/customer/account/login/')
  })
})
