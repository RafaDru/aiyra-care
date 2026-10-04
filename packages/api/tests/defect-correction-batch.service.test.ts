import { describe, expect, it, vi } from 'vitest'
import { runDefectCorrectionBatch } from '../src/application/ops/defect-correction-batch.service.js'
import type { DefectPrBatchService } from '../src/application/ops/defect-pr-batch.service.js'
import type { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'
import type { PlatformDefectService } from '../src/application/ops/platform-defect.service.js'

describe('runDefectCorrectionBatch', () => {
  it('runs PR batch only when auto start-fix is off', async () => {
    const defectPrBatchService = {
      runReadyForPrBatch: vi.fn(async () => ({
        batch: null,
        defectIds: [],
        count: 0,
      })),
    } as unknown as DefectPrBatchService

    const result = await runDefectCorrectionBatch(
      defectPrBatchService,
      {} as PlatformDefectService,
      {} as PlatformDefectPgRepository,
      { autoStartFix: false },
    )

    expect(defectPrBatchService.runReadyForPrBatch).toHaveBeenCalledOnce()
    expect(result.startFix.attempted).toBe(0)
  })
})
