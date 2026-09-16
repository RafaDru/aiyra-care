/**
 * Verifica alertas ops e envia ao webhook (Slack-compatible) se configurado.
 * Uso: npm run ops:alerts-check
 */
import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { OpsMetricsService } from '../src/application/ops/ops-metrics.service.js'
import { OpsAlertDispatchService } from '../src/application/ops/ops-alert-dispatch.service.js'
import { OpsMetricsPgRepository } from '../src/infrastructure/persistence/ops-metrics.pg.repository.js'
import { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'
import { LlmUsagePgRepository } from '../src/infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../src/infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { writeOpsMetricsArtifact } from '../src/application/ops/ops-probe-artifact.js'
import { runOpsProbe } from '../src/application/ops/ops-probe.service.js'
import { getRuntimeDegradedService } from '../src/application/ops/runtime-degraded.factory.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

async function main() {
  const metrics = new OpsMetricsService(
    new OpsMetricsPgRepository(pool),
    new LlmInternalCostService(
      new LlmUsagePgRepository(pool),
      new LlmInternalBudgetPgRepository(pool),
    ),
  )
  await runOpsProbe(pool)
  const dispatch = new OpsAlertDispatchService(metrics)
  const result = await dispatch.checkAndDispatch()
  const metricsPayload = await metrics.getMetrics()
  await getRuntimeDegradedService().applyFromOps(
    metricsPayload.alerts,
    metricsPayload.metrics.probe,
  )
  const artifactPath = writeOpsMetricsArtifact({
    generatedAt: new Date().toISOString(),
    metrics: metricsPayload.metrics,
    alerts: metricsPayload.alerts,
  })
  console.log(JSON.stringify({ ...result, metricsArtifact: artifactPath }, null, 2))
  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
