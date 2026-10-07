import { describe, expect, it } from 'vitest'
import { parseDateTimeBrToIso } from '../src/lib/input-masks'

/** Smoke helpers used by QuickCaptureSheet medication/agenda saves. */
describe('quick capture datetime', () => {
  it('parses BR date/time to ISO for API payloads', () => {
    const iso = parseDateTimeBrToIso('07/10/2026', '14:30')
    expect(iso).toBeTruthy()
    expect(new Date(iso!).getFullYear()).toBe(2026)
  })

  it('rejects incomplete datetime', () => {
    expect(parseDateTimeBrToIso('7/10/2026', '')).toBeNull()
  })
})
