import type { FastifyInstance } from 'fastify'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OpsMetricsService } from '../../../application/ops/ops-metrics.service.js'
import { OpsAlertDispatchService } from '../../../application/ops/ops-alert-dispatch.service.js'
import { DevAuditBridgeService, defaultDevAuditRoot } from '../../../application/ops/dev-audit-bridge.service.js'
import { LlmInternalCostService } from '../../../application/llm/llm-internal-cost.service.js'
import { LlmUsagePgRepository } from '../../persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../../persistence/llm-internal-budget.pg.repository.js'
import { OpsMetricsPgRepository } from '../../persistence/ops-metrics.pg.repository.js'
import { DevAuditBridgePgRepository } from '../../persistence/dev-audit-bridge.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { OpsController } from './ops.controller.js'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')

export async function opsRoutes(app: FastifyInstance) {
  const metricsRepo = new OpsMetricsPgRepository(pgPool)
  const internalCost = new LlmInternalCostService(
    new LlmUsagePgRepository(pgPool),
    new LlmInternalBudgetPgRepository(pgPool),
  )
  const metrics = new OpsMetricsService(metricsRepo, internalCost)
  const dispatch = new OpsAlertDispatchService(metrics)
  const devAuditBridge = new DevAuditBridgeService(
    new DevAuditBridgePgRepository(pgPool),
    defaultDevAuditRoot(monorepoRoot),
  )
  const controller = new OpsController(metrics, dispatch, devAuditBridge)

  app.get('/ops/metrics', controller.getMetrics.bind(controller))
  app.get('/ops/alerts', controller.getAlerts.bind(controller))
  app.post('/ops/alerts/check', controller.dispatchAlerts.bind(controller))
  app.get('/ops/dev-audit-bridge', controller.getDevAuditBridge.bind(controller))
}
