import type {
  HandwritingCreditAccount,
  HandwritingCreditsRepository,
  HandwritingQuota,
} from '../../domain/document/handwriting-understanding.js'
import {
  computeQuota,
  consumeOneCredit,
  defaultMonthlyFreeAllowance,
  isHandwritingInterpretationEnabled,
} from '../../domain/document/handwriting-policy.js'

export class HandwritingCreditsService {
  constructor(private readonly repo: HandwritingCreditsRepository) {}

  async getQuota(scopeId: string): Promise<HandwritingQuota> {
    const account = await this.repo.getOrCreateAccount(scopeId, defaultMonthlyFreeAllowance())
    return computeQuota(account, isHandwritingInterpretationEnabled())
  }

  async grantPackage(scopeId: string, credits: number, metadata?: Record<string, unknown>): Promise<HandwritingQuota> {
    if (credits <= 0) throw new Error('Pacote deve ter créditos positivos')
    const account = await this.repo.getOrCreateAccount(scopeId, defaultMonthlyFreeAllowance())
    const next: HandwritingCreditAccount = {
      ...account,
      packageCredits: account.packageCredits + credits,
    }
    await this.repo.saveAccount(next)
    await this.repo.appendEvent({
      scopeId,
      eventType: 'grant_package',
      creditsDelta: credits,
      metadata: { ...metadata, packageCreditsAfter: next.packageCredits },
    })
    return computeQuota(next, isHandwritingInterpretationEnabled())
  }

  /** Reserva e consome 1 crédito de interpretação manuscrita. */
  async consumeInterpretationCredit(scopeId: string, documentId: string): Promise<{
    quota: HandwritingQuota
    source: 'monthly_free' | 'package'
  }> {
    const account = await this.repo.getOrCreateAccount(scopeId, defaultMonthlyFreeAllowance())
    const { account: next, source } = consumeOneCredit(account)
    await this.repo.saveAccount(next)
    await this.repo.appendEvent({
      scopeId,
      documentId,
      eventType: 'interpret',
      creditsDelta: -1,
      metadata: { source },
    })
    return {
      source,
      quota: computeQuota(next, isHandwritingInterpretationEnabled()),
    }
  }
}
