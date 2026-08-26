export type LlmFeature = 'ava_chat' | 'handwriting' | 'ava_consult_prep' | 'label_classification' | 'exam_marker_extraction'

export type LlmTier = 'free' | 'premium'

/** Categoria de custo: uso do CLIENTE (pacotes) vs operacional INTERNO nosso. */
export type LlmCostBucket = 'client' | 'internal'

export type LlmUsageSource = 'api' | 'estimated'

export type LlmQuotaStatus = 'ok' | 'warn' | 'exhausted'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmTokenUsage {
  tokensIn: number
  tokensOut: number
  tokensTotal: number
  usageSource: LlmUsageSource
}

export interface LlmCompletionResult {
  text: string
  provider: string
  model: string
  tier: LlmTier
  usage: LlmTokenUsage
}

/** Opções da cascata Ava (provedor + consentimento Zen). */
export interface LlmRouterOptions {
  /** Aceita Zen gratuito (DeepSeek Free) — dados podem ser usados para melhorar o modelo. */
  allowLlmDataSharing?: boolean
}

export interface LlmUsageAccount {
  scopeId: string
  monthlyTokensUsed: number
  monthlyPeriod: string
}

export interface LlmUsageQuota {
  scopeId: string
  tokensPerCredit: number
  monthlyTokenAllowance: number
  monthlyTokensUsed: number
  monthlyTokensRemaining: number
  packageTokenBalance: number
  totalTokensRemaining: number
  creditsEquivalentRemaining: number
  warnAtPercent: number
  usagePercent: number
  status: LlmQuotaStatus
  monthlyPeriod: string
  /** Créditos manuscrito (pool compartilhado na origem) */
  handwritingCredits: {
    monthlyFreeRemaining: number
    packageCredits: number
    totalAvailable: number
  }
  llmEnabled: boolean
  /** Franquia desativada para esta conta (env `LLM_QUOTA_BYPASS_*`). */
  quotaBypassed?: boolean
}

export interface LlmUsageEventInput {
  scopeId: string
  accountId?: string
  feature: LlmFeature
  patientId?: string
  conversationId?: string
  provider: string
  model: string
  tier: LlmTier
  tokensIn: number
  tokensOut: number
  tokensTotal: number
  usageSource: LlmUsageSource
  estimatedCostCents?: number
  /** Custos: 'client' (pacotes/entitlements) ou 'internal' (operacional nosso). */
  costBucket?: LlmCostBucket
  metadata?: Record<string, unknown>
}

/** Orçamento mensal interno em centavos (default R$100/mês). */
export interface LlmInternalBudgetAccount {
  scopeId: string
  monthlyCostCents: number
  monthlyPeriod: string
}
