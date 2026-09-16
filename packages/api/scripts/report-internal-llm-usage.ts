/**
 * Relatório de observabilidade do LLM INTERNO (classificação de rótulos).
 * Mostra: orçamento do mês (R$), gasto, teto, e indicadores agregados.
 *
 * Usage:
 *   npx tsx packages/api/scripts/report-internal-llm-usage.ts [--top]
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { LlmUsagePgRepository } from '../src/infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../src/infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const costService = new LlmInternalCostService(
  new LlmUsagePgRepository(pool),
  new LlmInternalBudgetPgRepository(pool),
)

const ind = await costService.getIndicators()
const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`

console.log('=== LLM interno (classificação de rótulos) ===')
console.log(`Orçamento do mês:     ${brl(ind.monthlyBudgetBrlCents)}`)
console.log(`Gasto do mês:         ${brl(ind.spentBrlCents)}`)
console.log(`Restante:             ${brl(ind.remainingBrlCents)} ${ind.exhausted ? '(TETO ESGOTADO)' : ''}`)
console.log('--- Indicadores ---')
console.log(`Eventos de classificação:   ${ind.calls}`)
console.log(`Resolvidos via LLM:         ${ind.llmResolved}`)
console.log(`Fallback local (sem LLM):   ${ind.localFallback}`)
console.log(`Bloqueados pelo teto:       ${ind.budgetExhausted}`)
console.log(`Custo estimado total (USD): $${(ind.totalCostUsdCents / 100).toFixed(2)}`)

if (process.argv.includes('--top')) {
  const { rows } = await pool.query(
    `SELECT provider, model, COUNT(*)::int AS calls,
            COALESCE(SUM(estimated_cost_cents),0)::int AS cost_usd_cents
       FROM llm_usage_events
      WHERE feature = 'label_classification' AND cost_bucket = 'internal'
        AND to_char(created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')
      GROUP BY provider, model ORDER BY calls DESC`,
  )
  console.log('\n--- Por provedor/modelo ---')
  for (const r of rows) {
    console.log(`  ${r.provider} | ${r.model} | ${r.calls} chamadas | $${(Number(r.cost_usd_cents) / 100).toFixed(2)}`)
  }
}

await pool.end()
