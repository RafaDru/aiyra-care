import { describe, it, expect } from 'vitest'
import {
  ageMonthsAt,
  buildReferenceCurve,
  estimatePercentile,
  isGlucoseExamLabel,
  parseGlucoseMgDl,
  referenceAtAge,
} from '../src/domain/measurement/who-growth-reference.js'

describe('who-growth-reference', () => {
  it('ageMonthsAt computes months from birth', () => {
    const birth = new Date('2024-01-01T12:00:00Z')
    const at = new Date('2025-01-01T12:00:00Z')
    expect(ageMonthsAt(birth, at)).toBeGreaterThan(11.5)
    expect(ageMonthsAt(birth, at)).toBeLessThan(12.5)
  })

  it('referenceAtAge interpolates between knots', () => {
    const ref = referenceAtAge('male', 'weight', 6)
    expect(ref.p50).toBeGreaterThan(7)
    expect(ref.p50).toBeLessThan(9)
    expect(ref.p3).toBeLessThan(ref.p50)
    expect(ref.p97).toBeGreaterThan(ref.p50)
  })

  it('buildReferenceCurve returns ordered points', () => {
    const curve = buildReferenceCurve('female', 'height', 0, 12)
    expect(curve.length).toBeGreaterThan(10)
    expect(curve[0].ageMonths).toBe(0)
    expect(curve[curve.length - 1].ageMonths).toBe(12)
  })

  it('estimatePercentile is near 50 at P50', () => {
    const ref = referenceAtAge('male', 'weight', 12)
    const pct = estimatePercentile(ref.p3, ref.p50, ref.p97, ref.p50)
    expect(pct).toBeGreaterThan(45)
    expect(pct).toBeLessThan(55)
  })

  it('parseGlucoseMgDl extracts mg/dL values', () => {
    expect(parseGlucoseMgDl('Glicemia 98 mg/dL')).toBe(98)
    expect(parseGlucoseMgDl('resultado: 120 mg/dl')).toBe(120)
    expect(parseGlucoseMgDl('sem valor')).toBeNull()
    expect(parseGlucoseMgDl('10 mg/dL')).toBeNull()
  })

  it('isGlucoseExamLabel matches common names', () => {
    expect(isGlucoseExamLabel('Hemoglobina glicada')).toBe(true)
    expect(isGlucoseExamLabel('Hemograma completo')).toBe(false)
  })
})
