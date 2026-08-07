import { describe, it, expect } from 'vitest'
import { consumeOneCredit, computeQuota, normalizeMonthlyPeriod } from '../src/domain/document/handwriting-policy.js'
import type { HandwritingCreditAccount } from '../src/domain/document/handwriting-understanding.js'

describe('handwriting-policy', () => {
  const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
  const base: HandwritingCreditAccount = {
    scopeId: 'default',
    packageCredits: 5,
    monthlyFreeAllowance: 3,
    monthlyFreeUsed: 0,
    monthlyPeriod: period,
  }

  it('consumes monthly free before package credits', () => {
    const first = consumeOneCredit(base)
    expect(first.source).toBe('monthly_free')
    expect(first.account.monthlyFreeUsed).toBe(1)
    expect(first.account.packageCredits).toBe(5)

    const depleted = consumeOneCredit({
      ...base,
      monthlyFreeUsed: 3,
    })
    expect(depleted.source).toBe('package')
    expect(depleted.account.packageCredits).toBe(4)
  })

  it('computes total available quota', () => {
    const quota = computeQuota({ ...base, monthlyFreeUsed: 1 }, true)
    expect(quota.monthlyFreeRemaining).toBe(2)
    expect(quota.totalAvailable).toBe(7)
  })

  it('resets monthly usage on new period', () => {
    const reset = normalizeMonthlyPeriod({
      ...base,
      monthlyFreeUsed: 3,
      monthlyPeriod: '2020-01',
    })
    expect(reset.monthlyFreeUsed).toBe(0)
    expect(reset.monthlyPeriod).not.toBe('2020-01')
  })
})
