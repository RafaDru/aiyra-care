import { describe, it, expect } from 'vitest'
import { evaluateMedicationSafety, evaluateVitalRules } from '../src/application/family-support/family-support-rules.js'

describe('family-support-rules', () => {
  it('flags low SpO2 with seek_medical_care', () => {
    const insights = evaluateVitalRules([{
      typeCode: 'spo2',
      label: 'SpO2',
      unit: '%',
      value: 88,
      observedAt: new Date('2026-08-14T10:00:00Z'),
      observationId: 'obs-1',
      criticalLow: 90,
    }])
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0].action).toBe('seek_medical_care')
    expect(insights[0].citations[0].entityId).toBe('obs-1')
  })

  it('warns on NSAID combination', () => {
    const insights = evaluateMedicationSafety(
      'Ibuprofeno',
      [],
      [{ id: 'm1', genericName: 'Nimesulida', brandName: null }],
    )
    expect(insights.some((i) => i.title === 'Múltiplos anti-inflamatórios')).toBe(true)
  })

  it('blocks when allergy matches medication', () => {
    const insights = evaluateMedicationSafety(
      'Dipirona',
      [{ id: 'a1', allergen: 'Dipirona', reaction: 'rash' }],
      [],
    )
    expect(insights[0].priority).toBe('critical')
    expect(insights[0].action).toBe('do_not_apply')
  })
})
