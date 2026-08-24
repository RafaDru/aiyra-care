import type { LlmUsagePgRepository } from '../../infrastructure/persistence/llm-usage.pg.repository.js'
import type { LlmInternalBudgetPgRepository } from '../../infrastructure/persistence/llm-internal-budget.pg.repository.js'
import type { LlmTokenUsage } from '../../domain/llm/llm.types.js'
import {
  estimateInternalCostBrlCents,
  estimateInternalCostUsdCents,
  internalMonthlyBudgetCentsBrl,
} from '../../domain/llm/llm-internal-cost-policy.js'

export interface InternalLlmCall {
  provider: string
  model: string
  tier: 'free' | 'premium'
  usage: LlmTokenUsage
  patientId?: string
  conversationId?: string
  /** Feature de metering (default: label_classification). */
  feature?: string
  /** Extra contexto de observabilidade (ex.: qual job/integração originou). */
  metadata?: Record<string, unknown>
}

export interface InternalLlmBudgetView {
  monthlyBudgetBrlCents: number
  spentBrlCents: number
  remainingBrlCents: number
  exhausted: boolean
}

export interface InternalLlmIndicatorSummary {
  calls: number
  llmResolved: number
  localFallback: number
  budgetExhausted: number
  /** Custo estimado total em centavos de USD (para conferir com fatura do provedor). */
  totalCostUsdCents: number
}

/**
 * Custo operacional INTERNO (nosso — não do cliente).
 * Registra em llm_usage_events com cost_bucket='internal' e scope global,
 * e desconta do orçamento mensal interno (default R$100/mês).
 */
export class LlmInternalCostService {
  constructor(
    private readonly usageRepo: LlmUsagePgRepository,
    private readonly budgetRepo: LlmInternalBudgetPgRepository,
  ) {}

  async getBudget(): Promise<InternalLlmBudgetView> {
    const account = await this.budgetRepo.getOrCreate()
    const budget = internalMonthlyBudgetCentsBrl()
    const spent = account.monthlyCostCents
    return {
      monthlyBudgetBrlCents: budget,
      spentBrlCents: spent,
      remainingBrlCents: Math.max(0, budget - spent),
      exhausted: spent >= budget,
    }
  }

  estimateCostBrlCents(provider: string, model: string, usage: LlmTokenUsage): number {
    return estimateInternalCostBrlCents(provider, model, usage.tokensIn, usage.tokensOut)
  }

  /** Combina orçamento interno + indicadores agregados do mês (observabilidade). */
  async getIndicators(): Promise<InternalLlmIndicatorSummary & InternalLlmBudgetView> {
    const stats = await this.usageRepo.internalClassificationStats()
    const budget = await this.getBudget()
    return { ...budget, ...stats }
  }

  /** Confere teto antes de uma chamada interna. */
  async canSpend(
    provider: string,
    model: string,
    usage: LlmTokenUsage,
  ): Promise<boolean> {
    const view = await this.getBudget()
    if (view.exhausted) return false
    const estimated = estimateInternalCostBrlCents(provider, model, usage.tokensIn, usage.tokensOut)
    return view.remainingBrlCents >= estimated
  }

  /** Registra uma chamada interna (evento + saldo). Chamar APÓS a LLM responder. */
  async recordCall(call: InternalLlmCall): Promise<InternalLlmBudgetView> {
    const account = await this.budgetRepo.getOrCreate()
    const costBrlCents = estimateInternalCostBrlCents(
      call.provider,
      call.model,
      call.usage.tokensIn,
      call.usage.tokensOut,
    )
    const costUsdCents = estimateInternalCostUsdCents(
      call.provider,
      call.model,
      call.usage.tokensIn,
      call.usage.tokensOut,
    )
    const next = {
      ...account,
      monthlyCostCents: account.monthlyCostCents + costBrlCents,
    }
    await this.budgetRepo.save(next)
    await this.usageRepo.appendEvent({
      scopeId: 'internal-operations',
      feature: (call.feature ?? 'label_classification') as Parameters<typeof this.usageRepo.appendEvent>[0]['feature'],
      patientId: call.patientId,
      conversationId: call.conversationId,
      provider: call.provider,
      model: call.model,
      tier: call.tier,
      tokensIn: call.usage.tokensIn,
      tokensOut: call.usage.tokensOut,
      tokensTotal: call.usage.tokensTotal,
      usageSource: call.usage.usageSource,
      estimatedCostCents: costUsdCents,
      costBucket: 'internal',
      metadata: call.metadata,
    })
    const budget = internalMonthlyBudgetCentsBrl()
    return {
      monthlyBudgetBrlCents: budget,
      spentBrlCents: next.monthlyCostCents,
      remainingBrlCents: Math.max(0, budget - next.monthlyCostCents),
      exhausted: next.monthlyCostCents >= budget,
    }
  }

  /** Audit: rótulo ambíguo resolvido sem LLM (por regras/fuzzy) — custo zero. */
  async recordLocalFallback(metadata?: Record<string, unknown>): Promise<void> {
    await this.usageRepo.appendEvent({
      scopeId: 'internal-operations',
      feature: 'label_classification',
      provider: 'rules-fuzzy',
      model: 'n/a',
      tier: 'free',
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: 0,
      usageSource: 'estimated',
      estimatedCostCents: 0,
      costBucket: 'internal',
      metadata: { outcome: 'local_fallback', ...metadata },
    })
  }

  /** Audit: teto interno esgotado — LLM não chamado; caiu no determinístico. */
  async recordBudgetExhausted(metadata?: Record<string, unknown>): Promise<void> {
    await this.usageRepo.appendEvent({
      scopeId: 'internal-operations',
      feature: 'label_classification',
      provider: 'budget',
      model: 'n/a',
      tier: 'free',
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: 0,
      usageSource: 'estimated',
      estimatedCostCents: 0,
      costBucket: 'internal',
      metadata: { outcome: 'budget_exhausted', ...metadata },
    })
  }
}
