import type { Pool } from 'pg'
import { LlmRouter } from '../../infrastructure/llm/llm-router.js'
import { LlmUsagePgRepository } from '../../infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../../infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { LlmInternalCostService } from './llm-internal-cost.service.js'
import { LlmBackedLabelClassifier, defaultAllowLlm } from '../classification/llm-backed-label-classifier.js'
import { AmilLabelClassifier } from '../classification/amil-label-classifier.js'
import { VectorExamCatalogLookup } from '../../infrastructure/classification/vector-exam-catalog-lookup.js'
import { SemanticCatalogCachePgRepository } from '../../infrastructure/persistence/semantic-catalog-cache.pg.repository.js'

export interface BuildClassificationClassifierOpts {
  patientId?: string
  /** Override do env (jobs podem forçar). Se `undefined`, usa defaultAllowLlm(). */
  allowLlm?: boolean
  trigger?: string
  tier?: 'free' | 'premium'
}

/** Classificador de rótulos (regras/fuzzy) + fallback LLM com metering interno. */
export function buildClassificationClassifier(
  pool: Pool,
  opts: BuildClassificationClassifierOpts = {},
): LlmBackedLabelClassifier {
  const costService = new LlmInternalCostService(
    new LlmUsagePgRepository(pool),
    new LlmInternalBudgetPgRepository(pool),
  )
  return new LlmBackedLabelClassifier({
    local: new AmilLabelClassifier({ lookup: new VectorExamCatalogLookup() }),
    costService,
    router: new LlmRouter(),
    allowLlm: opts.allowLlm ?? defaultAllowLlm(),
    patientId: opts.patientId,
    tier: opts.tier,
    metadata: { trigger: opts.trigger ?? 'job' },
    cacheRepo: new SemanticCatalogCachePgRepository(pool),
  })
}

/** Se o LLM interno está habilitado por env para classificação. */
export function isInternalClassificationLlmEnabled(): boolean {
  return defaultAllowLlm()
}
