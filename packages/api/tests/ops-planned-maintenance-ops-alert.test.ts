import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldSuppressAutoIncDuringPlannedMaintenance } from '../src/domain/ops/ops-planned-maintenance.js'
import { shouldAutoInvestigateOpsAlert } from '../src/application/ops/ops-alert-investigator-dispatch.js'
import { investigateOpsAlertWithQueue } from '../src/application/ops/ops-analysis-investigation.helper.js'
import { IncidentDispatchService } from '../src/application/ops/incident-dispatch.service.js'
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

describe('ops_alert auto-INC during planned maintenance', () => {
  afterEach(() => {
    delete process.env.OPS_PLANNED_MAINTENANCE
  })

  it('shouldSuppressAutoIncDuringPlannedMaintenance only for auto trigger', () => {
    expect(
      shouldSuppressAutoIncDuringPlannedMaintenance('auto', { OPS_PLANNED_MAINTENANCE: '1' }),
    ).toBe(true)
    expect(
      shouldSuppressAutoIncDuringPlannedMaintenance('manual', { OPS_PLANNED_MAINTENANCE: '1' }),
    ).toBe(false)
  })

  it('shouldAutoInvestigateOpsAlert is false when maintenance active', () => {
    process.env.OPS_PLANNED_MAINTENANCE = '1'
    expect(shouldAutoInvestigateOpsAlert(infraCritical, infraTriage)).toBe(false)
  })

  it('investigateOpsAlertWithQueue skips enqueue for auto during maintenance', async () => {
    process.env.OPS_PLANNED_MAINTENANCE = '1'
    const enqueueOpsAlert = vi.fn()
    const queueService = { enqueueOpsAlert } as never

    const result = await investigateOpsAlertWithQueue(
      queueService,
      infraCritical,
      { checkedAt: '2026-01-01T00:00:00.000Z', trigger: 'auto' },
    )

    expect(enqueueOpsAlert).not.toHaveBeenCalled()
    expect(result.dispatch).toEqual({ outcome: 'skipped', reason: 'planned_maintenance' })
  })

  it('dispatchOpsAlertTriage skips outbox for auto during maintenance', async () => {
    process.env.OPS_PLANNED_MAINTENANCE = '1'
    const insertIfAbsent = vi.fn()
    const svc = new IncidentDispatchService(
      { insertIfAbsent, findByIdempotencyKey: vi.fn() } as never,
      {} as never,
      {} as never,
    )

    const dispatch = await svc.dispatchOpsAlertTriage(infraCritical, 'inc-1', {
      checkedAt: '2026-01-01T00:00:00.000Z',
      trigger: 'auto',
    })

    expect(insertIfAbsent).not.toHaveBeenCalled()
    expect(dispatch).toEqual({ outcome: 'skipped', reason: 'planned_maintenance' })
  })
})
