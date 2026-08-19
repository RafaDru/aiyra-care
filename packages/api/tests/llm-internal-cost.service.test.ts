import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'
import type { LlmUsagePgRepository } from '../src/infrastructure/persistence/llm-usage.pg.repository.js'
import type { LlmInternalBudgetPgRepository } from '../src/infrastructure/persistence/llm-internal-budget.pg.repository.js'

function fakeUsageRepo() {
  return {
    appendEvent: vi.fn().mockResolvedValue('evt-id'),
    internalClassificationStats: vi.fn().mockResolvedValue({
      calls: 3,
      llmResolved: 2,
      localFallback: 1,
      budgetExhausted: 0,
      totalCostUsdCents: 42,
    }),
  } as unknown as LlmUsagePgRepository
}

function fakeBudgetRepo(initial: { cost: number; period: string }) {
  let account = { scopeId: 'internal-operations', monthlyCostCents: initial.cost, monthlyPeriod: initial.period }
  const now = new Date()
  const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  return {
    getOrCreate: vi.fn().mockImplementation(async () => {
      if (account.monthlyPeriod !== currentPeriod) account = { ...account, monthlyPeriod: currentPeriod, monthlyCostCents: 0 }
      return { ...account }
    }),
    save: vi.fn().mockImplementation(async (a: typeof account) => { account = { ...a } }),
  } as unknown as LlmInternalBudgetPgRepository
}

const usage = { tokensIn: 500, tokensOut: 100, tokensTotal: 600, usageSource: 'estimated' as const }

function currentPeriod(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

describe('LlmInternalCostService', () => {
  beforeEach(() => {
    delete process.env.LLM_INTERNAL_MONTHLY_BUDGET_CENTS
    delete process.env.LLM_INTERNAL_USD_BRL
  })

  it('canSpend respeita o teto', async () => {
    const service = new LlmInternalCostService(fakeUsageRepo(), fakeBudgetRepo({ cost: 0, period: currentPeriod() }))
    expect(await service.canSpend('opencode-go', 'deepseek-v4-flash', usage)).toBe(true)
  })

  it('canSpend bloca quando esgotado', async () => {
    const service = new LlmInternalCostService(fakeUsageRepo(), fakeBudgetRepo({ cost: 10_000, period: currentPeriod() }))
    expect(await service.canSpend('opencode-go', 'deepseek-v4-flash', usage)).toBe(false)
  })

  it('recordCall soma custo e registra evento cost_bucket=internal', async () => {
    const usageRepo = fakeUsageRepo()
    const service = new LlmInternalCostService(usageRepo, fakeBudgetRepo({ cost: 0, period: currentPeriod() }))
    const view = await service.recordCall({
      provider: 'opencode-go',
      model: 'deepseek-v4-flash',
      tier: 'premium',
      usage,
      metadata: { trigger: 'test' },
    })
    expect(view.spentBrlCents).toBeGreaterThan(0)
    expect(view.monthlyBudgetBrlCents).toBe(10000)
    expect(usageRepo.appendEvent).toHaveBeenCalledTimes(1)
    const evt = (usageRepo.appendEvent as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(evt.costBucket).toBe('internal')
    expect(evt.feature).toBe('label_classification')
    expect(evt.scopeId).toBe('internal-operations')
  })

  it('getIndicators combina budget + stats', async () => {
    const usageRepo = fakeUsageRepo()
    const service = new LlmInternalCostService(usageRepo, fakeBudgetRepo({ cost: 2000, period: currentPeriod() }))
    const ind = await service.getIndicators()
    expect(ind.calls).toBe(3)
    expect(ind.llmResolved).toBe(2)
    expect(ind.localFallback).toBe(1)
    expect(ind.spentBrlCents).toBe(2000)
    expect(ind.exhausted).toBe(false)
  })
})
