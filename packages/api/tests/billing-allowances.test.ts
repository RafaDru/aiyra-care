import { describe, expect, it } from 'vitest'
import { freePlanMonthlyAllowance, familyPlanMonthlyAllowance } from '../src/application/billing/billing.service.js'

describe('billing allowances', () => {
  it('defaults family allowance to 40', () => {
    expect(familyPlanMonthlyAllowance()).toBe(40)
  })

  it('defaults free allowance to 10', () => {
    expect(freePlanMonthlyAllowance()).toBe(10)
  })
})
