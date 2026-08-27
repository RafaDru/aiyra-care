import { describe, expect, it } from 'vitest'
import {
  formatHygieneCandidateDescription,
  groupExamRows,
  groupVaccineRows,
  shouldOfferHygieneActions,
} from '../src/domain/llm/ava-context-aggregate.js'

describe('ava-context-aggregate', () => {
  it('groups vaccines by date + name + dose', () => {
    const date = new Date('2026-01-16T12:00:00.000Z')
    const groups = groupVaccineRows([
      { vaccineName: 'DNG', applicationDate: date, doseNumber: null },
      { vaccineName: 'DNG', applicationDate: date, doseNumber: null },
      { vaccineName: 'DNG', applicationDate: date, doseNumber: null },
      { vaccineName: 'Dengue', applicationDate: new Date('2026-06-25'), doseNumber: 1 },
    ])
    expect(groups.length).toBe(2)
    expect(groups.find((g) => g.items[0].vaccineName === 'DNG')?.items.length).toBe(3)
    expect(groups.find((g) => g.items[0].vaccineName === 'Dengue')?.items.length).toBe(1)
  })

  it('groups exams by date + type', () => {
    const date = new Date('2026-08-10T12:00:00.000Z')
    const groups = groupExamRows([
      { examType: 'Hemograma', examDate: date },
      { examType: 'Hemograma', examDate: date },
    ])
    expect(groups.length).toBe(1)
    expect(groups[0].items.length).toBe(2)
  })

  it('detects hygiene follow-up after assistant duplicate hint', () => {
    const assistant = 'DNG aparece com 3 registros no prontuário (possível duplicidade)'
    const user = 'Pode dar uma averiguada nas vacinas sim, parece que são as mesmas, se for, pode manter só uma referência.'
    expect(shouldOfferHygieneActions(user, assistant)).toBe(true)
    expect(shouldOfferHygieneActions('qual a última vacina?', assistant)).toBe(false)
  })

  it('formats hygiene description from evidence', () => {
    const text = formatHygieneCandidateDescription('vaccine', {
      vaccineName: 'DNG',
      applicationDate: '2026-01-16',
    }, 'vaccine_catalog_slot')
    expect(text).toContain('DNG')
    expect(text).toContain('2026-01-16')
  })
})
