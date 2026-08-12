import { describe, it, expect, vi } from 'vitest'
import type { Pool } from 'pg'
import { runConnectWorkerBatch, startConnectWorkerLoop } from '../src/infrastructure/sync/connect-worker.runner.js'

describe('connect-worker.runner', () => {
  it('startConnectWorkerLoop returns stop handle', () => {
    const pool = {} as Pool
    const worker = startConnectWorkerLoop(pool, 60000, {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })
    expect(worker.stop).toBeTypeOf('function')
    worker.stop()
  })

  it('runConnectWorkerBatch with empty links returns zero candidates', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool
    const report = await runConnectWorkerBatch(pool, {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })
    expect(report).toMatchObject({
      candidates: 0,
      started: 0,
      skipped: 0,
      failed: 0,
    })
  })
})
