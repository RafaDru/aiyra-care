import { describe, expect, it } from 'vitest'
import {
  formatBillingExportCsv,
  isBillingExportOperator,
  parseBillingExportMonth,
} from '../src/application/billing/billing-export.js'

describe('billing-export', () => {
  it('parseBillingExportMonth accepts YYYY-MM', () => {
    const p = parseBillingExportMonth('2026-08')
    expect(p.label).toBe('2026-08')
    expect(p.month).toBe(8)
  })

  it('formatBillingExportCsv includes header and rows', () => {
    const csv = formatBillingExportCsv([
      {
        kind: 'package',
        completedAt: '2026-08-01T12:00:00.000Z',
        accountEmail: 'a@b.com',
        accountFullName: 'Maria',
        amountBrl: '29.00',
        description: 'Pacote 10',
        packageCredits: 10,
        currency: 'brl',
        stripeSessionId: 'cs_test',
        stripePaymentIntentId: null,
        stripeSubscriptionId: null,
      },
    ])
    expect(csv.split('\n')[0]).toContain('kind')
    expect(csv).toContain('Maria')
    expect(csv).toContain('29.00')
  })

  it('isBillingExportOperator matches env list', () => {
    const prev = process.env.BILLING_EXPORT_ACCOUNT_IDS
    process.env.BILLING_EXPORT_ACCOUNT_IDS = 'abc-123, def-456'
    expect(isBillingExportOperator('abc-123')).toBe(true)
    expect(isBillingExportOperator('other')).toBe(false)
    process.env.BILLING_EXPORT_ACCOUNT_IDS = prev
  })
})
