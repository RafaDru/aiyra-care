import { describe, it, expect } from 'vitest'
import { applyTimelineFilters } from '../src/application/patient/patient-context.service.js'
import type { PatientContextTimelineEvent } from '../src/application/patient/patient-context.types.js'

const sample: PatientContextTimelineEvent[] = [
  { date: '2026-01-15T10:00:00.000Z', kind: 'exam', title: 'Hemograma', source: 'manual' },
  { date: '2026-02-01T10:00:00.000Z', kind: 'consultation', title: 'Pediatra', source: 'unimed' },
  { date: '2026-03-10T10:00:00.000Z', kind: 'vaccine', title: 'Tríplice', source: 'conectesus' },
]

describe('applyTimelineFilters', () => {
  it('filters by kind', () => {
    const result = applyTimelineFilters(sample, { kinds: ['exam', 'vaccine'] })
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.kind).sort()).toEqual(['exam', 'vaccine'])
  })

  it('filters by source case-insensitively', () => {
    const result = applyTimelineFilters(sample, { sources: ['UNIMED'] })
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('consultation')
  })

  it('filters by date range', () => {
    const result = applyTimelineFilters(sample, {
      from: new Date('2026-02-01T00:00:00.000Z'),
      to: new Date('2026-02-28T23:59:59.999Z'),
    })
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('consultation')
  })
})
