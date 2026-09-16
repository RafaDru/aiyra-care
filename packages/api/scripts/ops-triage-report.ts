/**
 * Triagem de alertas ops (infra vs app + human_required) — sem LLM, sem PHI.
 * Uso: npm run ops:triage
 */
import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { OpsMetricsService } from '../src/application/ops/ops-metrics.service.js'
import { OpsMetricsPgRepository } from '../src/infrastructure/persistence/ops-metrics.pg.repository.js'
import { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'
import { LlmUsagePgRepository } from '../src/infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../src/infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { triageOpsAlerts, resolveOpsAlertDispatchMode } from '../src/domain/ops/ops-alert-triage.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

async function main() {
  const service = new OpsMetricsService(
    new OpsMetricsPgRepository(pool),
    new LlmInternalCostService(
      new LlmUsagePgRepository(pool),
      new LlmInternalBudgetPgRepository(pool),
    ),
  )
  const { alerts } = await service.getMetrics()
  const triage = triageOpsAlerts(alerts)
  const humanRequired = triage.filter((t) => t.humanRequired)

  console.log('=== Ops alert triage ===')
  console.log(`Dispatch mode: ${resolveOpsAlertDispatchMode()}`)
  console.log(`Alerts: ${alerts.length} | human_required: ${humanRequired.length}`)
  console.log('')
  for (const row of triage) {
    console.log(
      `${row.humanRequired ? 'HUMAN' : 'auto'} [${row.tier}] ${row.alertId} (${row.severity}) — ${row.reason}`,
    )
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
