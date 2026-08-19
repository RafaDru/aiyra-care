import { describe, it, expect, afterEach } from 'vitest'
import {
  buildClassificationMessages,
  parseClassificationJson,
  estimateTokenUsage,
} from '../src/domain/llm/llm-internal-prompt.js'
import {
  estimateInternalCostBrlCents,
  estimateInternalCostUsdCents,
  internalMonthlyBudgetCentsBrl,
} from '../src/domain/llm/llm-internal-cost-policy.js'

afterEach(() => {
  delete process.env.LLM_INTERNAL_MONTHLY_BUDGET_CENTS
  delete process.env.LLM_INTERNAL_USD_BRL
})

describe('buildClassificationMessages', () => {
  it('monta system + user com labels únicos', () => {
    const msgs = buildClassificationMessages(['HEMOGRAMA', 'HEMOGRAMA', 'CONSULTA'])
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].content).toContain('HEMOGRAMA')
    expect(msgs[1].content).toContain('CONSULTA')
  })
})

describe('parseClassificationJson', () => {
  it('parseia array JSON válido', () => {
    const out = parseClassificationJson(
      '[{"label":"HEMOGRAMA","kind":"exame","destination":"exam","canonicalName":"Hemograma"},{"label":"CONSULTA EM PRONTO SOCORRO","kind":"consulta","destination":"medical_record"}]',
    )
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ label: 'HEMOGRAMA', kind: 'exame', destination: 'exam', canonicalName: 'Hemograma' })
    expect(out[1].destination).toBe('medical_record')
  })

  it('recupera array dentro de code fence markdown', () => {
    const out = parseClassificationJson('```json\n[{"label":"X","kind":"outro","destination":"medical_record"}]\n```')
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('outro')
  })

  it('deriva destination a partir do kind quando ausente', () => {
    const out = parseClassificationJson('[{"label":"VACINA FEBRE","kind":"vacina"}]')
    expect(out[0].destination).toBe('vaccine')
  })

  it('descarta itens sem label e input inválido', () => {
    expect(parseClassificationJson('[{"kind":"outro"}]')).toHaveLength(0)
    expect(parseClassificationJson('não é json')).toHaveLength(0)
  })
})

describe('estimateTokenUsage', () => {
  it('produz uso estimado consistente', () => {
    const usage = estimateTokenUsage(buildClassificationMessages(['HEMOGRAMA']))
    expect(usage.tokensIn).toBeGreaterThan(0)
    expect(usage.tokensTotal).toBe(usage.tokensIn + usage.tokensOut)
  })
})

describe('custo interno (policy)', () => {
  it('teto default R$100', () => {
    expect(internalMonthlyBudgetCentsBrl()).toBe(10000)
  })

  it('Zen free custa 0 (mesmo com tokens)', () => {
    expect(estimateInternalCostUsdCents('opencode-zen:deepseek-v4-flash-free', 'deepseek-v4-flash-free', 1000, 200)).toBe(0)
  })

  it('DeepSeek Go flash estima > 0', () => {
    const usd = estimateInternalCostUsdCents('opencode-go', 'deepseek-v4-flash', 1_000_000, 1_000_000)
    // $0.14 + $0.28 = $0.42 => 42 cents USD
    expect(usd).toBe(42)
  })

  it('converte para BRL cents usando câmbio default', () => {
    const brl = estimateInternalCostBrlCents('opencode-go', 'deepseek-v4-flash', 1_000_000, 1_000_000)
    // 42 cents USD * 5.2 = 218.4 => 218 BRL cents
    expect(brl).toBe(218)
  })
})
