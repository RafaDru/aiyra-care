import { afterEach, describe, expect, it, vi } from 'vitest'
import * as fixDispatch from '../src/application/ops/platform-defect-fix-dispatch.js'
import { finalizeTriageDefectPipeline } from '../src/application/ops/triage-defect-pipeline-followup.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'
import { platformDefectPipelineDefaults } from './fixtures/platform-defect-record.defaults.js'

function defect(overrides: Partial<PlatformDefectRecord> = {}): PlatformDefectRecord {
  return {
    id: 'def-1',
    referenceCode: 'DEF-000001',
    title: 't',
    status: 'open',
    fingerprint: null,
    impact: null,
    applications: [],
    triageSummary: null,
    triageArtifactPath: null,
    branchName: null,
    prUrl: null,
    parentDefectId: null,
    fixStartedAt: null,
    readyForPrAt: null,
    fixedAt: null,
    mergedAt: null,
    mergedPrUrl: null,
    fixedVia: null,
    lastFixDispatchSentAt: null,
    lastFailureSummary: null,
    lastCorrectionFailureDetails: null,
    correctionFailedAt: null,
    prBatchId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...platformDefectPipelineDefaults,
    ...overrides,
  }
}

describe('finalizeTriageDefectPipeline', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('resolves linked incidents when defect is already fixed', async () => {
    const resolveIncidentsLinkedToDefect = vi.fn(async () => 1)
    const setIncidentPipelineStatus = vi.fn(async () => undefined)
    const queueRepo = { resolveIncidentsLinkedToDefect, setIncidentPipelineStatus }

    const outcome = await finalizeTriageDefectPipeline({
      defect: defect({ status: 'fixed' }),
      incidentId: 'inc-1',
      queueRepo: queueRepo as never,
      defectService: {} as never,
      defectRepo: {} as never,
    })

    expect(outcome).toBe('resolved')
    expect(resolveIncidentsLinkedToDefect).toHaveBeenCalledWith('def-1')
    expect(setIncidentPipelineStatus).not.toHaveBeenCalled()
  })

  it('marks triaged and skips auto start-fix when env gate is off', async () => {
    vi.stubEnv('CH_AUTO_START_FIX_ON_TRIAGE', '0')
    const startSpy = vi.spyOn(fixDispatch, 'startPlatformDefectFixWithDispatch')
    const setIncidentPipelineStatus = vi.fn(async () => undefined)

    const outcome = await finalizeTriageDefectPipeline({
      defect: defect({ status: 'open' }),
      incidentId: 'inc-1',
      queueRepo: { setIncidentPipelineStatus } as never,
      defectService: {} as never,
      defectRepo: {} as never,
    })

    expect(outcome).toBe('triaged')
    expect(setIncidentPipelineStatus).toHaveBeenCalledWith('inc-1', 'triaged')
    expect(startSpy).not.toHaveBeenCalled()
  })

  it('auto start-fix when CH_AUTO_START_FIX_ON_TRIAGE=1 and defect open', async () => {
    vi.stubEnv('CH_AUTO_START_FIX_ON_TRIAGE', '1')
    const startSpy = vi
      .spyOn(fixDispatch, 'startPlatformDefectFixWithDispatch')
      .mockResolvedValue({
        item: defect({ status: 'in_fix' }),
        dispatch: { outcome: 'sent' },
      })
    const setIncidentPipelineStatus = vi.fn(async () => undefined)
    const defectService = { startFix: vi.fn() }
    const defectRepo = {}

    await finalizeTriageDefectPipeline({
      defect: defect({ status: 'open' }),
      incidentId: 'inc-1',
      queueRepo: { setIncidentPipelineStatus } as never,
      defectService: defectService as never,
      defectRepo: defectRepo as never,
    })

    expect(startSpy).toHaveBeenCalledWith(defectService, defectRepo, 'def-1')
  })
})
