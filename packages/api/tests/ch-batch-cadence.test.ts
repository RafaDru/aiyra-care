import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  autoStartFixOnTriage,
  defectCorrectionBatchAutoStartFix,
  defectCorrectionBatchIntervalMs,
  triageBatchIntervalMs,
} from '../src/application/ops/ch-batch-cadence.config.js'
import {
  IncidentDispatchService,
  resetIncidentDispatchWorkerClocks,
} from '../src/application/ops/incident-dispatch.service.js'
import type { IncidentDispatchOutboxPgRepository } from '../src/infrastructure/persistence/incident-dispatch-outbox.pg.repository.js'
import type { OpsAnalysisQueuePgRepository } from '../src/infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import type { SupportReportPgRepository } from '../src/infrastructure/persistence/support-report.pg.repository.js'

describe('ch-batch-cadence config', () => {
  it('parses triage batch interval', () => {
    expect(triageBatchIntervalMs({ CH_INCIDENT_TRIAGE_BATCH_INTERVAL_MS: '900000' })).toBe(900_000)
    expect(triageBatchIntervalMs({})).toBe(0)
    expect(triageBatchIntervalMs({ CH_INCIDENT_TRIAGE_BATCH_INTERVAL_MS: '0' })).toBe(0)
  })

  it('parses defect correction batch interval and auto start-fix', () => {
    expect(
      defectCorrectionBatchIntervalMs({ CH_DEFECT_CORRECTION_BATCH_INTERVAL_MS: '900000' }),
    ).toBe(900_000)
    expect(defectCorrectionBatchAutoStartFix({ CH_DEFECT_CORRECTION_BATCH_AUTO_START_FIX: '1' })).toBe(
      true,
    )
    expect(autoStartFixOnTriage({ CH_AUTO_START_FIX_ON_TRIAGE: '1' })).toBe(true)
    expect(autoStartFixOnTriage({})).toBe(false)
  })
})

describe('IncidentDispatchService triage batch tick', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetIncidentDispatchWorkerClocks()
  })

  it('runs backfill on first tick when triage batch interval is set', async () => {
    vi.stubEnv('CH_INCIDENT_TRIAGE_BATCH_INTERVAL_MS', '900000')
    resetIncidentDispatchWorkerClocks()

    const outbox = {
      listPending: vi.fn(async () => []),
    } as unknown as IncidentDispatchOutboxPgRepository
    const queueRepo = {
      listOpenNeedingDispatchOutbox: vi.fn(),
    } as unknown as OpsAnalysisQueuePgRepository
    const supportRepo = {} as SupportReportPgRepository
    const service = new IncidentDispatchService(outbox, queueRepo, supportRepo)

    const backfillSpy = vi.spyOn(service, 'backfillOpenIncidents').mockResolvedValue({
      scanned: 0,
      enqueued: 0,
      reset: 0,
      skipped: 0,
    })
    const reconcileSpy = vi.spyOn(service, 'reconcileOpenIncidents')

    const result = await service.runWorkerTick()
    expect(result.triageBatch).toBe(true)
    expect(backfillSpy).toHaveBeenCalledOnce()
    expect(reconcileSpy).not.toHaveBeenCalled()
  })
})
