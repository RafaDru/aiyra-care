import { describe, expect, it } from 'vitest'
import { buildUsageHeatmapByArea } from '../src/domain/ops/ops-usage-heatmap.js'
import { resolveUsageRange } from '../src/domain/ops/ops-usage-range.js'

describe('resolveUsageRange', () => {
  it('defaults to today with 15m granularity', () => {
    const r = resolveUsageRange('today')
    expect(r.preset).toBe('today')
    expect(r.granularity).toBe('15m')
    expect(r.to.getTime()).toBeGreaterThan(r.from.getTime())
  })

  it('7d uses hourly buckets', () => {
    const r = resolveUsageRange('7d')
    expect(r.granularity).toBe('1h')
  })

  it('rejects custom range over 90 days', () => {
    const from = new Date('2020-01-01T00:00:00Z')
    const to = new Date('2020-06-01T00:00:00Z')
    expect(() => resolveUsageRange('custom', from.toISOString(), to.toISOString())).toThrow(
      'usage_range_too_long',
    )
  })
})

describe('buildUsageHeatmapByArea', () => {
  it('aggregates features into catalog areas', () => {
    const bucket = new Date('2026-11-20T12:00:00Z')
    const heatmap = buildUsageHeatmapByArea(
      [
        {
          featureKey: 'patient_detail',
          bucketStart: bucket,
          sessionCount: 10,
          accountCount: 8,
          eventCount: 12,
        },
        {
          featureKey: 'dashboard',
          bucketStart: bucket,
          sessionCount: 5,
          accountCount: 4,
          eventCount: 5,
        },
      ],
      [{ feature: 'patient_detail', bucketStart: bucket, errorCount: 2 }],
      new Date('2026-11-20T00:00:00Z'),
      new Date('2026-11-20T23:00:00Z'),
      '1h',
      'today',
    )
    expect(heatmap.rows.length).toBeGreaterThan(0)
    const paciente = heatmap.rows.find((r) => r.area === 'Paciente')
    expect(paciente).toBeDefined()
    expect(paciente?.cells[0]?.sessionCount).toBe(10)
    expect(paciente?.cells[0]?.failRatePct).toBe(16.7)
  })
})