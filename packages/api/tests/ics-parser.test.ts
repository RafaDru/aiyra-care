import { describe, expect, it } from 'vitest'
import { parseIcsCalendar } from '../src/domain/scheduled-event/ics-parser.js'

const SAMPLE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:test-uid-1@google.com
DTSTART:20260815T140000Z
DTEND:20260815T150000Z
SUMMARY:Consulta pediatra
DESCRIPTION:Retorno anual
END:VEVENT
BEGIN:VEVENT
UID:test-uid-2@google.com
DTSTART:20260820
SUMMARY:Lembrete vacina
END:VEVENT
END:VCALENDAR`

describe('parseIcsCalendar', () => {
  it('parses VEVENT with datetime and date-only', () => {
    const events = parseIcsCalendar(SAMPLE)
    expect(events.length).toBe(2)
    expect(events[0].uid).toBe('test-uid-1@google.com')
    expect(events[0].title).toBe('Consulta pediatra')
    expect(events[0].description).toBe('Retorno anual')
    expect(events[1].title).toBe('Lembrete vacina')
  })

  it('returns empty for invalid content', () => {
    expect(parseIcsCalendar('not a calendar')).toEqual([])
  })
})
