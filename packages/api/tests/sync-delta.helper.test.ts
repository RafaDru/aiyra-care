import { describe, it, expect } from 'vitest'
import {
  computeMaterDeiExamStartDate,
  collectHouseholdPatientIds,
  computeUnimedExtratoMonths,
  computeUnimedAuthorizationSince,
  UNIMED_EXTRATO_MONTHS_FULL,
  UNIMED_EXTRATO_MONTHS_INCREMENTAL,
} from '../src/application/connect/sync-delta.helper.js'
import { IntegrationLink } from '../src/domain/integration-link/integration-link.entity.js'

describe('sync-delta.helper', () => {
  it('collectHouseholdPatientIds includes holder, parents and children', () => {
    const ids = collectHouseholdPatientIds('holder', [
      { id: 'holder', parentIds: ['parent'] },
      { id: 'child', parentIds: ['holder'] },
      { id: 'other', parentIds: [] },
    ])
    expect(ids).toContain('holder')
    expect(ids).toContain('parent')
    expect(ids).toContain('child')
    expect(ids).not.toContain('other')
  })

  it('computeMaterDeiExamStartDate uses max exam date with lookback', async () => {
    const pool = {
      query: async () => ({
        rows: [{ max_date: new Date('2026-06-01T12:00:00Z') }],
      }),
    } as unknown as import('pg').Pool
    const link = IntegrationLink.create({ patientId: 'p1', portalType: 'mater_dei' })
    const start = await computeMaterDeiExamStartDate(pool, link, ['p1'])
    expect(start).toBe('2026-05-18')
  })

  it('computeUnimedExtratoMonths uses 2 months incremental vs 6 full', () => {
    expect(computeUnimedExtratoMonths(true)).toBe(UNIMED_EXTRATO_MONTHS_INCREMENTAL)
    expect(computeUnimedExtratoMonths(false)).toBe(UNIMED_EXTRATO_MONTHS_FULL)
  })

  it('computeUnimedAuthorizationSince returns null for full sync', () => {
    const link = IntegrationLink.create({ patientId: 'p1', portalType: 'unimed' })
    link.markSynced()
    expect(computeUnimedAuthorizationSince(link, false)).toBeNull()
  })

  it('computeUnimedAuthorizationSince uses lastSync lookback when incremental', () => {
    const link = IntegrationLink.create({
      patientId: 'p1',
      portalType: 'unimed',
      lastSyncAt: new Date('2026-06-01T12:00:00Z'),
    })
    const since = computeUnimedAuthorizationSince(link, true)
    expect(since?.toISOString().slice(0, 10)).toBe('2026-05-18')
  })
})
