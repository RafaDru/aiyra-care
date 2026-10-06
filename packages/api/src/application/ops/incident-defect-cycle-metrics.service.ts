import type { IncidentDefectCycleMetrics } from '../../domain/ops/incident-defect-cycle-metrics.types.js'
import type { IncidentDefectCycleMetricsPgRepository } from '../../infrastructure/persistence/incident-defect-cycle-metrics.pg.repository.js'

export class IncidentDefectCycleMetricsService {
  constructor(private readonly repo: IncidentDefectCycleMetricsPgRepository) {}

  getMetrics(windowDays = 7): Promise<IncidentDefectCycleMetrics> {
    return this.repo.getMetrics(windowDays)
  }
}
