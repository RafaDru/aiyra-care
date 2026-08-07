import { describe, expect, it } from 'vitest'
import { conferVaccineRecord } from '../src/application/vaccine/vaccine-conference.service.js'

describe('conferVaccineRecord', () => {
  it('maps Caderneta DNG code to Dengue dose 1', () => {
    const result = conferVaccineRecord({
      vaccineName: 'DNG',
      doseLabel: '1ª Dose',
      doseNumber: 1,
      applicationDate: '2026-01-17',
      birthDate: '2020-01-23',
    })
    expect(result.catalogId).toBe('dengue')
    expect(result.catalogSlotKey).toBe('dengue:1')
    expect(result.displayName).toBe('Dengue')
    expect(result.method).toBe('alias')
  })

  it('maps dengue recombinante label to dose 2', () => {
    const result = conferVaccineRecord({
      vaccineName: 'vacina dengue (recombinante e atenuada)',
      doseLabel: '2ª Dose',
      doseNumber: 2,
      applicationDate: '2026-06-10',
      birthDate: '2020-01-23',
    })
    expect(result.catalogSlotKey).toBe('dengue:2')
    expect(result.displayName).toBe('Dengue')
  })
})
