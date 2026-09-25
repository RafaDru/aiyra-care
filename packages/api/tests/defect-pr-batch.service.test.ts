import { describe, expect, it, vi } from 'vitest'
import { DefectPrBatchService } from '../src/application/ops/defect-pr-batch.service.js'
import type { DefectPrBatchPgRepository } from '../src/infrastructure/persistence/defect-pr-batch.pg.repository.js'

describe('DefectPrBatchService', () => {
  it('exposes config window from env default', () => {
    const pool = {} as never
    const batchRepo = {
      countReadyWithoutBatch: vi.fn(async () => 2),
    } as unknown as DefectPrBatchPgRepository
    const svc = new DefectPrBatchService(pool, batchRepo)
    const cfg = svc.config()
    expect(cfg.intervalMs).toBe(21_600_000)
    expect(cfg.nextWindowAt).toMatch(/^\d{4}-/)
  })

  it('countReady delegates to repository', async () => {
    const batchRepo = {
      countReadyWithoutBatch: vi.fn(async () => 3),
    } as unknown as DefectPrBatchPgRepository
    const svc = new DefectPrBatchService({} as never, batchRepo)
    await expect(svc.countReady()).resolves.toBe(3)
  })
})
