import { describe, it, expect } from 'vitest'
import {
  INTEGRATION_OPTIONS,
  matchesIntegrationSearch,
  groupIntegrationOptions,
  getIntegrationOption,
} from '../src/components/integrations/integration-catalog.ts'

describe('integration-catalog Fleury group', () => {
  const fleury = INTEGRATION_OPTIONS.find((o) => o.id === 'fleury_precision')!

  it('exposes grupo Fleury as single laboratory option', () => {
    expect(fleury.portalType).toBe('hermes_pardini')
    expect(fleury.presentation).toBe('fleury_group')
    expect(fleury.title).toContain('Grupo Fleury')
  })

  it('matches search by sub-brand names', () => {
    expect(matchesIntegrationSearch(fleury, 'pardini')).toBe(true)
    expect(matchesIntegrationSearch(fleury, 'fleury')).toBe(true)
    expect(matchesIntegrationSearch(fleury, 'labs a+')).toBe(true)
    expect(matchesIntegrationSearch(fleury, 'xyz-nope')).toBe(false)
  })

  it('groups laboratory with fleury card when linked', () => {
    const groups = groupIntegrationOptions(new Set(['hermes_pardini']))
    const lab = groups.find((g) => g.id === 'laboratory')
    expect(lab?.options[0]?.linked).toBe(true)
  })

  it('aliases legacy hermes_pardini id', () => {
    expect(getIntegrationOption('hermes_pardini')?.id).toBe('fleury_precision')
  })
})
