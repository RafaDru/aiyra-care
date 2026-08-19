import { describe, it, expect } from 'vitest'
import type { HandwritingCreditAccount } from '../src/domain/document/handwriting-understanding.js'
import type { LlmUsageAccount } from '../src/domain/llm/llm.types.js'
import {
  assertTokenBudget,
  computeLlmUsageQuota,
  creditPoolTokens,
  estimateTokensFromText,
  recordTokenUsage,
  usageFromApiOrEstimate,
} from '../src/domain/llm/llm-policy.js'

describe('llm-policy', () => {
  const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`

  const credits: HandwritingCreditAccount = {
    scopeId: 'acc-1',
    packageCredits: 2,
    monthlyFreeAllowance: 10,
    monthlyFreeUsed: 3,
    monthlyPeriod: period,
  }

  const usage: LlmUsageAccount = {
    scopeId: 'acc-1',
    monthlyTokensUsed: 5000,
    monthlyPeriod: period,
  }

  it('estimates tokens from text', () => {
    expect(estimateTokensFromText('')).toBe(0)
    expect(estimateTokensFromText('abcd')).toBeGreaterThan(0)
  })

  it('prefers API usage when available', () => {
    const u = usageFromApiOrEstimate({ promptTokens: 100, completionTokens: 50 }, 'x', 'y')
    expect(u.usageSource).toBe('api')
    expect(u.tokensTotal).toBe(150)
  })

  it('computes quota with warn status', () => {
    const heavyUsage: LlmUsageAccount = { ...usage, monthlyTokensUsed: 75000 }
    const quota = computeLlmUsageQuota(heavyUsage, credits, true)
    expect(quota.totalTokensRemaining).toBeGreaterThan(0)
    expect(['ok', 'warn', 'exhausted']).toContain(quota.status)
  })

  it('blocks when token budget exceeded', () => {
    const exhausted: LlmUsageAccount = { ...usage, monthlyTokensUsed: creditPoolTokens(credits) }
    expect(() => assertTokenBudget(exhausted, credits, 1)).toThrow('LLM_QUOTA_EXCEEDED')
  })

  it('records token usage increment', () => {
    const next = recordTokenUsage(usage, 2000)
    expect(next.monthlyTokensUsed).toBe(7000)
  })
})
