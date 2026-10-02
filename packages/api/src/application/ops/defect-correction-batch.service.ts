import type { DefectPrBatchService, DefectPrBatchRunResult } from './defect-pr-batch.service.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import type { PlatformDefectService } from './platform-defect.service.js'
import {
  defectCorrectionBatchAutoStartFix,
  defectCorrectionBatchStartFixLimit,
} from './ch-batch-cadence.config.js'
import {
  dispatchErrorMessage,
  startPlatformDefectFixWithDispatch,
} from './platform-defect-fix-dispatch.js'

export type DefectCorrectionBatchStartFixSummary = {
  attempted: number
  sent: number
  failed: number
  skipped: number
}

export type DefectCorrectionBatchResult = {
  prBatch: DefectPrBatchRunResult
  startFix: DefectCorrectionBatchStartFixSummary
}

export async function runDefectCorrectionBatch(
  defectPrBatchService: DefectPrBatchService,
  platformDefectService: PlatformDefectService,
  platformDefectRepo: PlatformDefectPgRepository,
  options?: { autoStartFix?: boolean; startFixLimit?: number },
): Promise<DefectCorrectionBatchResult> {
  const prBatch = await defectPrBatchService.runReadyForPrBatch()

  const startFix: DefectCorrectionBatchStartFixSummary = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  }

  const autoStartFix = options?.autoStartFix ?? defectCorrectionBatchAutoStartFix()
  if (!autoStartFix) {
    return { prBatch, startFix }
  }

  const limit = options?.startFixLimit ?? defectCorrectionBatchStartFixLimit()
  const open = await platformDefectRepo.listForOps({ statuses: ['open'], limit })

  for (const defect of open) {
    if (startFix.attempted >= limit) break
    startFix.attempted += 1
    try {
      const { dispatch } = await startPlatformDefectFixWithDispatch(
        platformDefectService,
        platformDefectRepo,
        defect.id,
      )
      if (dispatch.outcome === 'sent') startFix.sent += 1
      else if (dispatch.outcome === 'skipped') startFix.skipped += 1
      else {
        startFix.failed += 1
        const msg = dispatchErrorMessage(dispatch)
        if (msg) {
          console.warn('[defect-correction-batch] start-fix failed', defect.id, msg)
        }
      }
    } catch (err) {
      startFix.failed += 1
      console.warn(
        '[defect-correction-batch] start-fix error',
        defect.id,
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  return { prBatch, startFix }
}
