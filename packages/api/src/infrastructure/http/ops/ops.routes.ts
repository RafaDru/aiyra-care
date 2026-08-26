import type { FastifyInstance } from 'fastify'
import { OpsMetricsService } from '../../../application/ops/ops-metrics.service.js'
import { LlmInternalCostService } from '../../../application/llm/llm-internal-cost.service.js'
import { LlmUsagePgRepository } from '../../persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../../persistence/llm-internal-budget.pg.repository.js'
import { OpsMetricsPgRepository } from '../../persistence/ops-metrics.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { OpsController } from './ops.controller.js'

export async function opsRoutes(app: FastifyInstance) {
  const metricsRepo = new OpsMetricsPgRepository(pgPool)
  const internalCost = new LlmInternalCostService(
    new LlmUsagePgRepository(pgPool),
    new LlmInternalBudgetPgRepository(pgPool),
  )
  const metrics = new OpsMetricsService(metricsRepo, internalCost)
  const controller = new OpsController(metrics)

  app.get('/ops/metrics', controller.getMetrics.bind(controller))
  app.get('/ops/alerts', controller.getAlerts.bind(controller))
}
