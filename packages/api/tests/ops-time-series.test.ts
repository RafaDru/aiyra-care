import { describe, expect, it } from 'vitest'
import { buildTimeSeries24h, mapHourBucket } from '../src/domain/ops/ops-time-series.js'

describe('ops-time-series', () => {
  it('mapHourBucket adds ISO hour and label', () => {
    const d = new Date('2026-09-02T15:00:00.000Z')
    const row = mapHourBucket({ hour: d, count: 3 })
    expect(row.hour).toBe(d.toISOString())
    expect(row.label).toBeTruthy()
    expect(row.count).toBe(3)
  })

  it('buildTimeSeries24h maps all series', () => {
    const hour = new Date('2026-09-02T10:00:00.000Z')
    const result = buildTimeSeries24h(
      [{ hour, success: 2, failed: 1 }],
      [{ hour, completed: 5, failed: 1, quotaBlocked: 0 }],
      [{ hour, count: 4 }],
      [{ hour, turns: 3, tokens: 900 }],
    )
    expect(result.syncJobs[0].success).toBe(2)
    expect(result.avaEvents[0].completed).toBe(5)
    expect(result.clientErrors[0].count).toBe(4)
    expect(result.avaTokens[0].tokens).toBe(900)
    expect(result.syncJobs[0].label).toBeTruthy()
  })
})
