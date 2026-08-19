import { describe, expect, it } from 'vitest'
import { groupTimelineEvents } from '../src/application/patient/timeline-grouping.js'
import type { PatientContextTimelineEvent } from '../src/application/patient/patient-context.types.js'

function event(
  partial: Partial<PatientContextTimelineEvent> & Pick<PatientContextTimelineEvent, 'date' | 'kind' | 'title' | 'source'>,
): PatientContextTimelineEvent {
  return {
    subtitle: undefined,
    entityId: partial.entityId ?? `id-${partial.title}`,
    ...partial,
  }
}

describe('groupTimelineEvents', () => {
  it('keeps single events unchanged', () => {
    const input = [
      event({ date: '2026-06-15T10:00:00.000Z', kind: 'vaccine', title: 'BCG', source: 'manual' }),
      event({ date: '2026-06-10T10:00:00.000Z', kind: 'authorization', title: 'Guia 123', source: 'unimed' }),
    ]
    const out = groupTimelineEvents(input)
    expect(out).toHaveLength(2)
    expect(out[0].kind).toBe('vaccine')
    expect(out[0].count).toBeUndefined()
  })

  it('groups same-day exams into one row with items', () => {
    const input = [
      event({ date: '2026-06-15T08:00:00.000Z', kind: 'exam', title: 'Hemácias', source: 'hermes', entityId: 'e1' }),
      event({ date: '2026-06-15T08:01:00.000Z', kind: 'exam', title: 'Hematócrito', source: 'hermes', entityId: 'e2' }),
      event({ date: '2026-06-15T08:02:00.000Z', kind: 'exam', title: 'Leucócitos', source: 'hermes', entityId: 'e3' }),
    ]
    const out = groupTimelineEvents(input)
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('3 exames')
    expect(out[0].count).toBe(3)
    expect(out[0].items?.length).toBe(3)
  })

  it('does not merge different kinds on the same day', () => {
    const input = [
      event({ date: '2026-06-15T10:00:00.000Z', kind: 'vaccine', title: 'BCG', source: 'manual' }),
      event({ date: '2026-06-15T14:00:00.000Z', kind: 'authorization', title: 'Guia', source: 'unimed' }),
      event({ date: '2026-06-15T08:00:00.000Z', kind: 'exam', title: 'Hemácias', source: 'hermes' }),
    ]
    const out = groupTimelineEvents(input)
    expect(out).toHaveLength(3)
    expect(out.map((e) => e.kind).sort()).toEqual(['authorization', 'exam', 'vaccine'])
  })

  it('groups multiple vaccines on the same day', () => {
    const input = [
      event({ date: '2026-06-15T10:00:00.000Z', kind: 'vaccine', title: 'BCG', source: 'manual' }),
      event({ date: '2026-06-15T11:00:00.000Z', kind: 'vaccine', title: 'Hepatite B', source: 'manual' }),
    ]
    const out = groupTimelineEvents(input)
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('2 vacinas')
    expect(out[0].count).toBe(2)
  })
})
