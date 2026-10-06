import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { ClientErrorIncidentSignalPgRepository } from '../src/infrastructure/persistence/client-error-incident-signal.pg.repository.js'

describe('ClientErrorIncidentSignalPgRepository.tryAcquireEnqueueSlot', () => {
  it('returns acquired when INSERT returns a row', async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ occurrence_count: 1, last_enqueued_at: new Date('1970-01-01') }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ fingerprint: 'fp1' }] }),
    } as unknown as Pool
    const repo = new ClientErrorIncidentSignalPgRepository(pool)
    const result = await repo.tryAcquireEnqueueSlot('fp1', 'local', 3600000, 1)
    expect(result).toEqual({ acquired: true })
    expect(pool.query).toHaveBeenCalledTimes(2)
  })

  it('blocks when conflict within dedupe window (no row returned)', async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ occurrence_count: 2, last_enqueued_at: new Date() }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }),
    } as unknown as Pool
    const repo = new ClientErrorIncidentSignalPgRepository(pool)
    const result = await repo.tryAcquireEnqueueSlot('fp1', 'local', 3600000, 1)
    expect(result).toEqual({ acquired: false, reason: 'dedupe_window' })
  })

  it('returns min_count when occurrence below threshold', async () => {
    const pool = {
      query: vi.fn(async () => ({
        rows: [{ occurrence_count: 1, last_enqueued_at: new Date('1970-01-01') }],
      })),
    } as unknown as Pool
    const repo = new ClientErrorIncidentSignalPgRepository(pool)
    const result = await repo.tryAcquireEnqueueSlot('fp1', 'local', 3600000, 3)
    expect(result).toEqual({ acquired: false, reason: 'min_count' })
    expect(pool.query).toHaveBeenCalledTimes(1)
  })
})
