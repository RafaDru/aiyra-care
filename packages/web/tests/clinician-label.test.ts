import { describe, expect, it } from 'vitest'
import { avaIntroUsesPediatricCopy, clinicianLabelForAgeCategory } from '../src/lib/clinician-label.js'

describe('clinicianLabelForAgeCategory', () => {
  it('maps child and adolescent to pediatra', () => {
    expect(clinicianLabelForAgeCategory('children')).toBe('pediatra')
    expect(clinicianLabelForAgeCategory('adolescents')).toBe('pediatra')
  })

  it('maps adults to médico', () => {
    expect(clinicianLabelForAgeCategory('adults')).toBe('médico')
  })
})

describe('avaIntroUsesPediatricCopy', () => {
  it('uses adult copy for titular regardless of category', () => {
    expect(avaIntroUsesPediatricCopy({ isSelf: true, ageCategory: 'adults' })).toBe(false)
    expect(avaIntroUsesPediatricCopy({ isSelf: true, ageCategory: 'children' })).toBe(false)
  })

  it('uses pediatric copy for child dependents', () => {
    expect(avaIntroUsesPediatricCopy({ isSelf: false, ageCategory: 'children' })).toBe(true)
  })

  it('uses adult copy for adult dependents', () => {
    expect(avaIntroUsesPediatricCopy({ isSelf: false, ageCategory: 'adults' })).toBe(false)
  })
})
