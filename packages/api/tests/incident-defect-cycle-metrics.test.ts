import { describe, expect, it, vi } from 'vitest'
import { IncidentDefectCycleMetricsService } from '../src/application/ops/incident-defect-cycle-metrics.service.js'
import type { IncidentDefectCycleMetricsPgRepository } from '../src/infrastructure/persistence/incident-defect-cycle-metrics.pg.repository.js'

describe('IncidentDefectCycleMetricsService', () => {
  it('returns repository metrics with default window', async () => {
    const sample = {
      windowDays: 7,
      generatedAt: '2026-10-06T00:00:00.000Z',
      incidents: { open: 3, resolvedInWindow: 12 },
      defects: { inFix: 1, awaitingMerge: 1, fixedInWindow: 5, avgDaysToFixed: 2.4 },
    }
    const repo: IncidentDefectCycleMetricsPgRepository = {
      getMetrics: vi.fn(async () => sample),
    } as unknown as IncidentDefectCycleMetricsPgRepository
    const service = new IncidentDefectCycleMetricsService(repo)
    await expect(service.getMetrics()).resolves.toEqual(sample)
    expect(repo.getMetrics).toHaveBeenCalledWith(7)
  })
})
