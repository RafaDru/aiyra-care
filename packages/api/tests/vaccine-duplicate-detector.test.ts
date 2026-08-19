import { describe, it, expect } from 'vitest'
import { Vaccine } from '../src/domain/vaccine/vaccine.entity.js'
import {
  detectVaccineDuplicatePair,
  findVaccineDuplicateCandidates,
} from '../src/domain/hygiene/vaccine-duplicate-detector.js'

function vaccine(
  id: string,
  patientId: string,
  name: string,
  date: string,
  dose?: number,
  source = 'manual',
) {
  return Vaccine.restore({
    id,
    patientId,
    vaccineName: name,
    doseNumber: dose ?? null,
    batchNumber: null,
    applicationDate: new Date(date),
    nextDoseDate: null,
    appliedBy: null,
    clinic: null,
    notes: null,
    source,
    createdAt: new Date(),
  })
}

describe('vaccine-duplicate-detector', () => {
  it('detects same date and dengue label (conferência)', () => {
    const a = vaccine('a', 'p1', 'vacina dengue (recombinante e atenuada)', '2026-06-25', undefined, 'manual')
    const b = vaccine('b', 'p1', 'vacina dengue (recombinante e atenuada)', '2026-06-25', undefined, 'conectesus')
    const hit = detectVaccineDuplicatePair(a, b, '1985-01-01')
    expect(hit?.detector).toBe('vaccine_catalog_slot')
    expect(hit?.score).toBeGreaterThanOrEqual(90)
  })

  it('detects identical name on same date', () => {
    const a = vaccine('a', 'p1', 'Dengue', '2026-06-25', 1)
    const b = vaccine('b', 'p1', 'Dengue', '2026-06-25', 1)
    const hit = detectVaccineDuplicatePair(a, b)
    expect(hit?.detector).toBe('vaccine_catalog_slot')
  })

  it('ignores different dates', () => {
    const a = vaccine('a', 'p1', 'Dengue', '2026-06-25', 1)
    const b = vaccine('b', 'p1', 'Dengue', '2026-07-01', 1)
    expect(detectVaccineDuplicatePair(a, b)).toBeNull()
  })

  it('finds cluster of three', () => {
    const list = [
      vaccine('1', 'p1', 'vacina dengue (recombinante e atenuada)', '2026-06-25'),
      vaccine('2', 'p1', 'vacina dengue (recombinante e atenuada)', '2026-06-25'),
      vaccine('3', 'p1', 'vacina dengue (recombinante e atenuada)', '2026-06-25'),
    ]
    const hits = findVaccineDuplicateCandidates(list, '1985-01-01')
    expect(hits.length).toBe(3)
  })
})
