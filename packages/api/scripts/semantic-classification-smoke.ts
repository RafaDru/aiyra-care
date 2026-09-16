import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { UnifiedSemanticClassifierService } from '../src/application/semantic-classification/unified-semantic-classifier.service.js'
import { SemanticCatalogCachePgRepository } from '../src/infrastructure/persistence/semantic-catalog-cache.pg.repository.js'
import { LlmRouter } from '../src/infrastructure/llm/llm-router.js'
import { parseClassificationJson, buildClassificationMessages, estimateTokenUsage } from '../src/domain/llm/llm-internal-prompt.js'
import { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'
import { LlmUsagePgRepository } from '../src/infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../src/infrastructure/persistence/llm-internal-budget.pg.repository.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const cacheRepo = new SemanticCatalogCachePgRepository(pool)
const costService = new LlmInternalCostService(
  new LlmUsagePgRepository(pool),
  new LlmInternalBudgetPgRepository(pool),
)
const router = new LlmRouter()

const service = new UnifiedSemanticClassifierService<string, string>({
  domain: 'health_label',
  acceptableVectorThreshold: 0.82,
  cacheRepo,
  staticCatalog: [
    {
      id: 'HEMOGRAMA',
      canonicalName: 'Hemograma Completo',
      kind: 'exame',
      destination: 'exam',
      aliases: ['10101012 - Hemograma Completo com Plaquetas', 'HEMOGRAMA'],
    },
    {
      id: 'CONSULTA_PS',
      canonicalName: 'Consulta em Pronto Socorro',
      kind: 'pronto-socorro',
      destination: 'medical_record',
      aliases: ['10101039 - CONSULTA EM PRONTO SOCORRO', 'ATENDIMENTO PS PEDIATRICO'],
    },
  ],
  async llmFallback(rawLabel) {
    const messages = buildClassificationMessages([rawLabel])
    const usage = estimateTokenUsage(messages)
    const canSpend = await costService.canSpend('llm', 'probe', usage)
    if (!canSpend) return null

    try {
      const completion = await router.completeJson(messages, 'premium', {
        allowLlmDataSharing: true,
        opencodeSessionId: 'semantic-classification-smoke',
      })
      await costService.recordCall({
        provider: completion.provider,
        model: completion.model,
        tier: completion.tier,
        usage: completion.usage,
        metadata: { purpose: 'unified_semantic_smoke' },
      })
      const parsed = parseClassificationJson(completion.text)
      const p = parsed[0]
      if (!p) return null
      return {
        kind: p.kind,
        destination: p.destination,
        canonicalName: p.canonicalName,
        catalogId: p.canonicalName ? `llm:${p.canonicalName}` : undefined,
        reason: 'Classificado via LLM com teto interno',
      }
    } catch {
      return null
    }
  },
})

async function run() {
  console.log('=== DEMO 3-TIER UNIFIED SEMANTIC CLASSIFIER ===\n')

  const testLabels = [
    '10101039 - Consulta em Pronto Socorro', // Tier 1: Vetor / Exact Match
    '90131700 - PCT TELESSAÚDE MEDICINA URGENTE', // Tier 2 -> LLM -> Tier 3: Auto-Salva no Catálogo Dinâmico
  ]

  for (const label of testLabels) {
    console.log(`[TESTE] Classificando: "${label}"`)
    const res1 = await service.classify(label)
    console.log(` -> Método: ${res1.method.toUpperCase()} | Kind: ${res1.kind} | Dest: ${res1.destination}`)
    console.log(` -> Confiança: ${res1.confidence} | Reason: ${res1.reason}`)
    if (res1.vectorSimilarity) console.log(` -> Similaridade Vetorial: ${res1.vectorSimilarity}`)
    console.log('')

    // Se foi LLM, roda uma 2ª vez para demonstrar o Hit Instantâneo do Catálogo Dinâmico!
    if (res1.method === 'llm') {
      console.log(`[TESTE 2a RODADA] Classificando novamente exatamente o mesmo rótulo: "${label}"`)
      const res2 = await service.classify(label)
      console.log(` -> Método: ${res2.method.toUpperCase()} | Kind: ${res2.kind} | Dest: ${res2.destination}`)
      console.log(` -> Confiança: ${res2.confidence} | Reason: ${res2.reason}`)
      console.log(` -> (Zero chamadas de LLM! Hit direto do catálogo dinâmico)\n`)
    }
  }

  const budget = await costService.getBudget()
  console.log(`Status Orçamento LLM Interno: R$ ${(budget.spentBrlCents / 100).toFixed(2)} / R$ ${(budget.monthlyBudgetBrlCents / 100).toFixed(2)}`)

  await pool.end()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
