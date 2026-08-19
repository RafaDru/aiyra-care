import type { HandwritingCreditsService } from '../handwriting/handwriting-credits.service.js'
import type { LlmUsagePgRepository } from '../../infrastructure/persistence/llm-usage.pg.repository.js'
import type { HandwritingCreditsRepository } from '../../domain/document/handwriting-understanding.js'
import type {
  LlmFeature,
  LlmMessage,
  LlmTier,
  LlmTokenUsage,
  LlmUsageQuota,
} from '../../domain/llm/llm.types.js'
import {
  assertTokenBudget,
  avaReserveOutputTokens,
  computeLlmUsageQuota,
  estimatedLlmCostCents,
  estimateCompletionReserve,
  handwritingInterpretTokenDebit,
  isAvaLlmEnabled,
  recordTokenUsage,
  tierForCreditSource,
} from '../../domain/llm/llm-policy.js'
import { defaultMonthlyFreeAllowance } from '../../domain/document/handwriting-policy.js'

export class LlmQuotaService {
  constructor(
    private readonly usageRepo: LlmUsagePgRepository,
    private readonly creditsRepo: HandwritingCreditsRepository,
    private readonly handwritingCredits?: HandwritingCreditsService,
  ) {}

  async getQuota(scopeId: string): Promise<LlmUsageQuota> {
    const usageAccount = await this.usageRepo.getOrCreateUsageAccount(scopeId)
    const creditAccount = await this.creditsRepo.getOrCreateAccount(scopeId, defaultMonthlyFreeAllowance())
    return computeLlmUsageQuota(usageAccount, creditAccount, isAvaLlmEnabled())
  }

  async assertCanSpend(scopeId: string, estimatedTokens: number): Promise<LlmUsageQuota> {
    const usageAccount = await this.usageRepo.getOrCreateUsageAccount(scopeId)
    const creditAccount = await this.creditsRepo.getOrCreateAccount(scopeId, defaultMonthlyFreeAllowance())
    assertTokenBudget(usageAccount, creditAccount, estimatedTokens)
    return computeLlmUsageQuota(usageAccount, creditAccount, isAvaLlmEnabled())
  }

  async recordUsage(
    scopeId: string,
    input: {
      accountId?: string
      feature: LlmFeature
      patientId?: string
      conversationId?: string
      provider: string
      model: string
      tier: LlmTier
      usage: LlmTokenUsage
      metadata?: Record<string, unknown>
    },
  ): Promise<LlmUsageQuota> {
    const usageAccount = await this.usageRepo.getOrCreateUsageAccount(scopeId)
    const creditAccount = await this.creditsRepo.getOrCreateAccount(scopeId, defaultMonthlyFreeAllowance())
    const nextUsage = recordTokenUsage(usageAccount, input.usage.tokensTotal)
    await this.usageRepo.saveUsageAccount(nextUsage)
    await this.usageRepo.appendEvent({
      scopeId,
      accountId: input.accountId,
      feature: input.feature,
      patientId: input.patientId,
      conversationId: input.conversationId,
      provider: input.provider,
      model: input.model,
      tier: input.tier,
      tokensIn: input.usage.tokensIn,
      tokensOut: input.usage.tokensOut,
      tokensTotal: input.usage.tokensTotal,
      usageSource: input.usage.usageSource,
      estimatedCostCents: estimatedLlmCostCents(input.tier, input.provider),
      metadata: input.metadata,
    })
    return computeLlmUsageQuota(nextUsage, creditAccount, isAvaLlmEnabled())
  }

  /** Telemetria após interpretação manuscrito (crédito já consumido — só auditoria). */
  async recordHandwritingInterpret(
    scopeId: string,
    input: {
      accountId?: string
      documentId: string
      provider: string
      tier: LlmTier
      usage?: LlmTokenUsage
    },
  ): Promise<void> {
    const usage = input.usage ?? {
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: handwritingInterpretTokenDebit(),
      usageSource: 'estimated' as const,
    }
    await this.usageRepo.appendEvent({
      scopeId,
      accountId: input.accountId,
      feature: 'handwriting',
      provider: input.provider,
      model: input.provider,
      tier: input.tier,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      tokensTotal: usage.tokensTotal,
      usageSource: usage.usageSource,
      estimatedCostCents: estimatedLlmCostCents(input.tier, input.provider),
      metadata: { documentId: input.documentId },
    })
  }

  async prepareAvaTurn(scopeId: string, messages: LlmMessage[]): Promise<LlmUsageQuota> {
    const estimate = estimateCompletionReserve(messages, avaReserveOutputTokens())
    return this.assertCanSpend(scopeId, estimate)
  }

  tierFromCreditSource(source: 'monthly_free' | 'package'): LlmTier {
    return tierForCreditSource(source)
  }

  async refundHandwritingCredit(scopeId: string, documentId: string): Promise<void> {
    if (!this.handwritingCredits) return
    await this.handwritingCredits.grantPackage(scopeId, 1, {
      refund: true,
      documentId,
    })
  }
}
