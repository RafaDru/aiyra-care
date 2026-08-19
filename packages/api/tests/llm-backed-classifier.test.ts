import { describe, it, expect, vi } from 'vitest'
import { LlmBackedLabelClassifier } from '../src/application/classification/llm-backed-label-classifier.js'
import { AmilLabelClassifier } from '../src/application/classification/amil-label-classifier.js'
import { FuzzyExamCatalogLookup } from '../src/infrastructure/classification/fuzzy-exam-catalog-lookup.js'
import type { LlmRouter } from '../src/infrastructure/llm/llm-router.js'
import type { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'

const local = new AmilLabelClassifier({ lookup: new FuzzyExamCatalogLookup() })

function fakeCost(overrides: Partial<Record<'canSpend' | 'recordCall' | 'recordLocalFallback' | 'recordBudgetExhausted', ReturnType<typeof vi.fn>>> = {}) {
  return {
    canSpend: overrides.canSpend ?? vi.fn().mockResolvedValue(true),
    recordCall: overrides.recordCall ?? vi.fn().mockResolvedValue(undefined),
    recordLocalFallback: overrides.recordLocalFallback ?? vi.fn().mockResolvedValue(undefined),
    recordBudgetExhausted: overrides.recordBudgetExhausted ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as LlmInternalCostService
}

function fakeRouter(completeJson = vi.fn()) {
  return { completeJson } as unknown as LlmRouter
}

function okCompletion(text: string) {
  return {
    text,
    provider: 'opencode-go:deepseek-v4-flash',
    model: 'deepseek-v4-flash',
    tier: 'premium' as const,
    usage: { tokensIn: 500, tokensOut: 80, tokensTotal: 580, usageSource: 'estimated' as const },
  }
}

describe('LlmBackedLabelClassifier', () => {
  it('não chama LLM para rótulo de alta confiança', async () => {
    const completeJson = vi.fn()
    const cls = new LlmBackedLabelClassifier({
      local, router: fakeRouter(completeJson), costService: fakeCost(), allowLlm: true,
    })
    const res = await cls.classify('HEMOGRAMA')
    expect(res.destination).toBe('exam')
    expect(completeJson).not.toHaveBeenCalled()
  })

  it('usa LLM para rótulo ambíguo e registra custo interno', async () => {
    const label = 'QWERTYUIOP ASDFGHJKL 99887766'
    const completeJson = vi.fn().mockResolvedValue(okCompletion(
      `[{"label":"${label}","kind":"exame","destination":"exam","canonicalName":"Atendimento"}]`,
    ))
    const recordCall = vi.fn()
    const cls = new LlmBackedLabelClassifier({
      local, router: fakeRouter(completeJson), costService: fakeCost({ recordCall }), allowLlm: true,
    })
    const res = await cls.classify(label)
    expect(completeJson).toHaveBeenCalled()
    expect(recordCall).toHaveBeenCalled()
    expect(res.method).toBe('llm')
    expect(res.destination).toBe('exam')
  })

  it('com teto esgotado não chama LLM e registra budget_exhausted', async () => {
    const completeJson = vi.fn()
    const budgetExhausted = vi.fn()
    const cls = new LlmBackedLabelClassifier({
      local,
      router: fakeRouter(completeJson),
      costService: fakeCost({ canSpend: vi.fn().mockResolvedValue(false), recordBudgetExhausted: budgetExhausted }),
      allowLlm: true,
    })
    const res = await cls.classify('ROTULO BASTANTE AMBIGUO SEM CATALOGO QUALQUER 12345')
    expect(completeJson).not.toHaveBeenCalled()
    expect(budgetExhausted).toHaveBeenCalled()
    expect(res.method).not.toBe('llm')
  })

  it('com allowLlm=false cai direto no determinístico', async () => {
    const completeJson = vi.fn()
    const cls = new LlmBackedLabelClassifier({
      local, router: fakeRouter(completeJson), costService: fakeCost(), allowLlm: false,
    })
    await cls.classify('ROTULO BASTANTE AMBIGUO SEM CATALOGO QUALQUER 12345')
    expect(completeJson).not.toHaveBeenCalled()
  })

  it('classifyBatch só consulta LLM para os ambíguos', async () => {
    const completeJson = vi.fn().mockResolvedValue(okCompletion(
      '[{"label":"ZZZ AMBIGUO QUALQUER 999","kind":"outro","destination":"medical_record"}]',
    ))
    const cls = new LlmBackedLabelClassifier({
      local, router: fakeRouter(completeJson), costService: fakeCost(), allowLlm: true,
    })
    const out = await cls.classifyBatch(['HEMOGRAMA', 'ZZZ AMBIGUO QUALQUER 999'])
    expect(out).toHaveLength(2)
    // HEMOGRAMA resolvido por regras (não LLM)
    expect(out[0].destination).toBe('exam')
    expect(completeJson).toHaveBeenCalledTimes(1)
  })
})
