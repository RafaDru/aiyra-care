import type pg from 'pg'

export async function runOpsAlertsCheck(pool: pg.Pool) {
  const { OpsMetricsService } = await import('../../api/src/application/ops/ops-metrics.service.js')
  const { OpsAlertDispatchService } = await import('../../api/src/application/ops/ops-alert-dispatch.service.js')
  const { OpsMetricsPgRepository } = await import('../../api/src/infrastructure/persistence/ops-metrics.pg.repository.js')
  const { LlmInternalCostService } = await import('../../api/src/application/llm/llm-internal-cost.service.js')
  const { LlmUsagePgRepository } = await import('../../api/src/infrastructure/persistence/llm-usage.pg.repository.js')
  const { LlmInternalBudgetPgRepository } = await import('../../api/src/infrastructure/persistence/llm-internal-budget.pg.repository.js')

  const metrics = new OpsMetricsService(
    new OpsMetricsPgRepository(pool),
    new LlmInternalCostService(
      new LlmUsagePgRepository(pool),
      new LlmInternalBudgetPgRepository(pool),
    ),
  )
  const dispatch = new OpsAlertDispatchService(metrics)
  return dispatch.checkAndDispatch()
}
