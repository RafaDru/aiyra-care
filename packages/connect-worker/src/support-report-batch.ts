import type { Pool } from 'pg'
import { SupportReportPgRepository } from '../../api/src/infrastructure/persistence/support-report.pg.repository.js'
import { OpsAnalysisQueuePgRepository } from '../../api/src/infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import { OpsAnalysisQueueService } from '../../api/src/application/ops/ops-analysis-queue.service.js'
import { runSupportReportBatchDispatch } from '../../api/src/application/support-report/support-report-batch.js'
import { isSupportInvestigatorBatchMode } from '../../api/src/domain/ops/support-investigator-mode.js'

export async function runSupportReportBatchCheck(pool: Pool) {
  if (!isSupportInvestigatorBatchMode()) {
    return { skipped: true, reason: 'mode_immediate' }
  }
  const supportRepo = new SupportReportPgRepository(pool)
  const queueService = new OpsAnalysisQueueService(new OpsAnalysisQueuePgRepository(pool), supportRepo)
  return runSupportReportBatchDispatch({ supportRepo, queueService })
}
