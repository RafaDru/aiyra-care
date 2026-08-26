/**
 * Relatório CLI de métricas ops (Ava tokens, sync, alertas).
 * Uso: npm run ops:metrics
 * Requer DATABASE_URL; opcional OPS_METRICS_KEY se quiser espelhar auth HTTP.
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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

async function main() {
  const service = new OpsMetricsService(
    new OpsMetricsPgRepository(pool),
    new LlmInternalCostService(
      new LlmUsagePgRepository(pool),
      new LlmInternalBudgetPgRepository(pool),
    ),
  )
  const { metrics, alerts } = await service.getMetrics()

  console.log('=== Ops metrics ===')
  console.log(`Generated: ${metrics.generatedAt}`)
  console.log('')
  console.log('Ava 24h: turns=%d p50=%s p95=%s tokens_sum=%d',
    metrics.ava.last24h.turns,
    metrics.ava.last24h.p50Tokens,
    metrics.ava.last24h.p95Tokens,
    metrics.ava.last24h.tokensTotalSum,
  )
  console.log('Ava 7d:  turns=%d p50=%s p95=%s',
    metrics.ava.last7d.turns,
    metrics.ava.last7d.p50Tokens,
    metrics.ava.last7d.p95Tokens,
  )
  if (metrics.ava.providerMix24h.length) {
    console.log('')
    console.log('Provider mix 24h:')
    for (const row of metrics.ava.providerMix24h) {
      console.log(`  ${row.provider}/${row.model}: ${row.turns} turns, ${row.tokensTotal} tokens`)
    }
  }
  if (metrics.sync.portalStats24h.length) {
    console.log('')
    console.log('Sync 24h by portal:')
    for (const row of metrics.sync.portalStats24h) {
      console.log(`  ${row.portalType}: ${row.failed}/${row.total} failed (${row.failRatePct}%)`)
    }
  }
  if (metrics.sync.stuckJobs.length) {
    console.log('')
    console.log('Stuck sync jobs:')
    for (const job of metrics.sync.stuckJobs) {
      console.log(`  ${job.jobId} ${job.portalType} ${job.minutesRunning}min`)
    }
  }
  console.log('')
  console.log('Product events 1h: completed=%d failed=%d quota_blocked=%d',
    metrics.productEvents.last1h.avaChatCompleted,
    metrics.productEvents.last1h.avaChatFailed,
    metrics.productEvents.last1h.avaQuotaBlocked,
  )
  if (alerts.length) {
    console.log('')
    console.log('=== Alerts (%d) ===', alerts.length)
    for (const alert of alerts) {
      console.log(`[${alert.severity}] ${alert.category}: ${alert.message}`)
    }
  } else {
    console.log('')
    console.log('No active alerts.')
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
