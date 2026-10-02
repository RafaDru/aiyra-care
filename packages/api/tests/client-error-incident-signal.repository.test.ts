import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { ClientErrorIncidentSignalPgRepository } from '../src/infrastructure/persistence/client-error-incident-signal.pg.repository.js'

describe('ClientErrorIncidentSignalPgRepository.tryAcquireEnqueueSlot', () => {
  it('returns acquired when INSERT returns a row', async () => {
    const pool = {
      query: vi.fn(async () => ({ rowCount: 1, rows: [{ fingerprint: 'fp1' }] })),
    } as unknown as Pool
    const repo = new ClientErrorIncidentSignalPgRepository(pool)
    const result = await repo.tryAcquireEnqueueSlot('fp1', 'local', 3600000)
    expect(result).toEqual({ acquired: true })
    expect(pool.query).toHaveBeenCalled()
  })

  it('blocks when conflict within dedupe window (no row returned)', async () => {
    const pool = {
      query: vi.fn(async () => ({ rowCount: 0, rows: [] })),
    } as unknown as Pool
    const repo = new ClientErrorIncidentSignalPgRepository(pool)
    const result = await repo.tryAcquireEnqueueSlot('fp1', 'local', 3600000)
    expect(result).toEqual({ acquired: false, reason: 'dedupe_window' })
  })
})
