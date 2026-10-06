import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldSuppressAutoIncDuringPlannedMaintenance } from '../src/domain/ops/ops-planned-maintenance.js'
import { shouldAutoInvestigateOpsAlert } from '../src/application/ops/ops-alert-investigator-dispatch.js'
import { investigateOpsAlertWithQueue } from '../src/application/ops/ops-analysis-investigation.helper.js'
import { IncidentDispatchService } from '../src/application/ops/incident-dispatch.service.js'
import { OpsAnalysisQueueService } from '../src/application/ops/ops-analysis-queue.service.js'
import type { OpsAlert } from '../src/domain/ops/ops-metrics.types.js'

const infraCritical: OpsAlert = {
  id: 'infra_api_down',
  severity: 'critical',
  category: 'infra',
  message: 'API down',
  detectedAt: '2026-01-01T00:00:00.000Z',
}

const infraTriage = {
  alertId: 'infra_api_down',
  severity: 'critical' as const,
  category: 'infra' as const,
  tier: 'infra' as const,
  humanRequired: true,
  reason: 'critical',
}

describe('ops_alert during planned maintenance (decisão 7A+tag)', () => {
  afterEach(() => {
    delete process.env.OPS_PLANNED_MAINTENANCE
  })

  it('shouldSuppressAutoIncDuringPlannedMaintenance only for auto trigger (bridge/5xx)', () => {
    expect(
      shouldSuppressAutoIncDuringPlannedMaintenance('auto', { OPS_PLANNED_MAINTENANCE: '1' }),
    ).toBe(true)
    expect(
      shouldSuppressAutoIncDuringPlannedMaintenance('manual', { OPS_PLANNED_MAINTENANCE: '1' }),
    ).toBe(false)
  })

  it('shouldAutoInvestigateOpsAlert stays enabled when maintenance active', () => {
    process.env.OPS_PLANNED_MAINTENANCE = '1'
    expect(shouldAutoInvestigateOpsAlert(infraCritical, infraTriage)).toBe(true)
  })

  it('investigateOpsAlertWithQueue enqueues during maintenance', async () => {
    process.env.OPS_PLANNED_MAINTENANCE = '1'
    const enqueueOpsAlert = vi.fn(async () => ({
      id: 'q-1',
      sourceType: 'ops_alert',
      sourceId: infraCritical.id,
      lane: 'sre_support',
      status: 'queued',
      incidentPipelineStatus: 'open',
      priority: 'critical',
      deploymentTier: 'integration',
      title: 't',
      errorSummary: null,
      contextSnapshot: { plannedMaintenanceActive: true },
      remediationSummary: null,
      analysisArtifactPath: null,
      prUrl: null,
      analysisLastError: null,
      operatorNotes: null,
      investigationTrigger: 'auto',
      queuedAt: new Date().toISOString(),
      investigationRequestedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    const queueService = { enqueueOpsAlert } as never
    const dispatchOpsAlertTriage = vi.fn(async () => ({ outcome: 'skipped', reason: 'webhook_not_configured' }))
    const incidentDispatch = { dispatchOpsAlertTriage } as never

    const result = await investigateOpsAlertWithQueue(
      queueService,
      infraCritical,
      { checkedAt: '2026-01-01T00:00:00.000Z', trigger: 'auto' },
      incidentDispatch,
    )

    expect(enqueueOpsAlert).toHaveBeenCalled()
    expect(result.investigationId).toBe('q-1')
    expect(dispatchOpsAlertTriage).toHaveBeenCalled()
  })

  it('dispatchOpsAlertTriage proceeds for auto during maintenance', async () => {
    process.env.OPS_PLANNED_MAINTENANCE = '1'
    const insertIfAbsent = vi.fn(async () => ({ id: 'out-1' }))
    const svc = new IncidentDispatchService(
      {
        insertIfAbsent,
        findByIdempotencyKey: vi.fn(),
        bumpAttempt: vi.fn(),
      } as never,
      {} as never,
      {} as never,
    )

    const dispatch = await svc.dispatchOpsAlertTriage(infraCritical, 'inc-1', {
      checkedAt: '2026-01-01T00:00:00.000Z',
      trigger: 'auto',
    })

    expect(insertIfAbsent).toHaveBeenCalled()
    expect(dispatch).not.toEqual({ outcome: 'skipped', reason: 'planned_maintenance' })
  })

  it('enqueueOpsAlert sets plannedMaintenanceActive in contextSnapshot', async () => {
    process.env.OPS_PLANNED_MAINTENANCE = '1'
    const upsertQueued = vi.fn(async (input: { contextSnapshot: Record<string, unknown> }) => ({
      id: 'q-2',
      ...input,
      sourceType: 'ops_alert',
      sourceId: infraCritical.id,
      lane: 'sre_support',
      status: 'queued',
      incidentPipelineStatus: 'open',
      priority: 'critical',
      deploymentTier: 'integration',
      title: 't',
      errorSummary: null,
      remediationSummary: null,
      analysisArtifactPath: null,
      prUrl: null,
      analysisLastError: null,
      operatorNotes: null,
      investigationTrigger: 'auto',
      queuedAt: new Date().toISOString(),
      investigationRequestedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    const svc = new OpsAnalysisQueueService({ upsertQueued } as never)
    await svc.enqueueOpsAlert(infraCritical, { trigger: 'auto' })
    expect(upsertQueued).toHaveBeenCalledWith(
      expect.objectContaining({
        contextSnapshot: expect.objectContaining({ plannedMaintenanceActive: true }),
      }),
    )
  })
})
