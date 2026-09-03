/**
 * Smoke: demonstra o fallback LLM INTERNO de classificação de rótulos com metering.
 * Roda UMA chamada real (rótulo ambíguo) via cascata e imprime custo metrito.
 *
 * Usage:
 *   npx tsx packages/api/scripts/llm-internal-classify-smoke.ts <label?>
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { buildClassificationClassifier } from '../src/application/llm/llm-internal-cost.factory.js'
import { LlmUsagePgRepository } from '../src/infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../src/infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const label = process.argv[2] ?? 'CONSULTA MEDICA EM DOMICILIO COM PROCEDIMENTO AVANCADO 778877'
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const classifier = buildClassificationClassifier(pool, { allowLlm: true, trigger: 'smoke' })
const costService = new LlmInternalCostService(
  new LlmUsagePgRepository(pool),
  new LlmInternalBudgetPgRepository(pool),
)

const before = await costService.getBudget()
const local = classifier.classifySync(label)
console.log(`Label: '${label}'`)
console.log(`Local (regras): kind=${local.kind} dest=${local.destination} conf=${local.confidence.toFixed(2)}`)

const result = await classifier.classify(label)
const after = await costService.getBudget()

console.log(`Final: kind=${result.kind} dest=${result.destination} method=${result.method} conf=${result.confidence.toFixed(2)}${result.canonicalName ? ' as=' + result.canonicalName : ''}`)
console.log('--- Metering interno ---')
console.log(`Custo antes: R$ ${(before.spentBrlCents / 100).toFixed(2)} | depois: R$ ${(after.spentBrlCents / 100).toFixed(2)}`)
console.log(`Orçamento restante: R$ ${(after.remainingBrlCents / 100).toFixed(2)}`)

await pool.end()
