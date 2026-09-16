import { describe, expect, it } from 'vitest'
import {
  connectorForLegacyPortal,
  getConnector,
  listConnectors,
} from '@aiyra-care/connect'

describe('@aiyra-care/connect registry', () => {
  it('maps hermes_pardini portal to grupo Fleury connector', () => {
    const c = connectorForLegacyPortal('hermes_pardini')
    expect(c?.id).toBe('grupo_fleury_precision_care')
    expect(c?.authProfile).toBe('interactive_otp')
    expect(c?.subBrands).toContain('hermes_pardini')
  })

  it('lists government connectors for SUS', () => {
    const gov = listConnectors().filter((c) => c.category === 'government')
    expect(gov.map((c) => c.id)).toEqual(expect.arrayContaining(['conectesus', 'caderneta_digital']))
    expect(gov.find((c) => c.id === 'conectesus')?.authProfile).toBe('interactive_govbr')
  })

  it('returns connector by id', () => {
    expect(getConnector('unimed_bh')?.legacyPortalType).toBe('unimed')
  })
})
