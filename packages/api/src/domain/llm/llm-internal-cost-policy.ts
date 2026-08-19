/** Política de custo do LLM INTERNO (operacional nosso — não do cliente).
 *  Fonte: estimativa por tokens × preço por 1M do modelo usado.
 *  Preços em USD cents / 1M tokens (calibrado 2026-08); sobrescrevível via env.
 */
import type { LlmUsageEventInput } from './llm.types.js'

export interface InternalModelPrice {
  inputPer1MUsdCents: number
  outputPer1MUsdCents: number
}

/** Default centavos de real/mês (R$100). */
export function internalMonthlyBudgetCentsBrl(): number {
  const n = Number(process.env.LLM_INTERNAL_MONTHLY_BUDGET_CENTS ?? 10000)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10000
}

/** Câmbio USD→BRL usado para converter custo estimado da chamada. */
export function internalUsdBrlRate(): number {
  const n = Number(process.env.LLM_INTERNAL_USD_BRL ?? 5.2)
  return Number.isFinite(n) && n > 0 ? n : 5.2
}

/** Preço por 1M tokens (USD cents) por provider:model. Zen Free = $0. */
const DEFAULT_MODEL_PRICES: Record<string, InternalModelPrice> = {
  'zen:free': { inputPer1MUsdCents: 0, outputPer1MUsdCents: 0 },
  'opencode-zen:deepseek-v4-flash-free': { inputPer1MUsdCents: 0, outputPer1MUsdCents: 0 },
  'opencode-go:deepseek-v4-flash': { inputPer1MUsdCents: 14, outputPer1MUsdCents: 28 }, // $0.14/$0.28
  'opencode-go:deepseek-v4-pro': { inputPer1MUsdCents: 44, outputPer1MUsdCents: 87 },   // $0.435/$0.87
  'gemini:gemini-2.5-flash': { inputPer1MUsdCents: 30, outputPer1MUsdCents: 250 },     // $0.30/$2.50
  'gemini:gemini-2.5-flash-lite': { inputPer1MUsdCents: 10, outputPer1MUsdCents: 40 }, // $0.10/$0.40
  'gemini:gemini-3.5-flash-lite': { inputPer1MUsdCents: 10, outputPer1MUsdCents: 40 },
  'groq:default': { inputPer1MUsdCents: 25, outputPer1MUsdCents: 100 },
}

/** Override opcional via env JSON: { "<provider:model>": {input, output} } em USD cents. */
function priceOverrides(): Record<string, InternalModelPrice> {
  const raw = process.env.LLM_INTERNAL_PRICE_OVERRIDE_JSON?.trim()
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, InternalModelPrice>
  } catch {
    return {}
  }
}

function modelPrice(provider: string, model: string): InternalModelPrice {
  // `provider` já carrega o modelo (ex.: 'opencode-go:deepseek-v4-flash') — checa direto.
  const overrides = priceOverrides()
  for (const key of [provider, model, `${provider}:${model}`]) {
    if (overrides[key]) return overrides[key]
  }
  for (const key of [provider, model]) {
    const hit = DEFAULT_MODEL_PRICES[key]
    if (hit) return hit
  }
  return DEFAULT_MODEL_PRICES['opencode-go:deepseek-v4-flash']
}

function estimateCostUsdCents(
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const p = modelPrice(provider, model)
  // inputPer1M*OsCents já estão em CENTAVOS de USD por 1M tokens.
  return (tokensIn / 1_000_000) * p.inputPer1MUsdCents
    + (tokensOut / 1_000_000) * p.outputPer1MUsdCents
}

/** Custo estimado da chamada em CENTAVOS DE REAL (moeda do orçamento interno). */
export function estimateInternalCostBrlCents(
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  return Math.max(1, Math.round(estimateCostUsdCents(provider, model, tokensIn, tokensOut) * internalUsdBrlRate()))
}

/** Custo estimado em centavos de USD — para gravar em llm_usage_events. */
export function estimateInternalCostUsdCents(
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  return Math.max(0, Math.round(estimateCostUsdCents(provider, model, tokensIn, tokensOut)))
}

/** Separa o custo de uma chamada interna (costBucked 'internal'). */
export function toInternalEventInput(
  event: Omit<LlmUsageEventInput, 'costBucket'>,
): LlmUsageEventInput {
  return { ...event, costBucket: 'internal' }
}
