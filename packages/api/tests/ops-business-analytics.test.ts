import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { OpsMetricsPgRepository } from '../src/infrastructure/persistence/ops-metrics.pg.repository.js'

function mockPool(queries: Record<string, unknown>): Pool {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('total_accounts')) {
        return { rows: [queries.activation] }
      }
      if (sql.includes('dormant_accounts_30d')) {
        return { rows: [queries.engagement] }
      }
      if (sql.includes('analysis_pending')) {
        return { rows: [queries.support] }
      }
      if (sql.includes('GROUP BY category')) {
        return { rows: queries.supportCategories as unknown[] }
      }
      if (sql.includes('checkout_started_7d')) {
        return { rows: [queries.billingEvents] }
      }
      if (sql.includes('paid_plans')) {
        return { rows: [queries.billingEntitlements] }
      }
      if (sql.includes('revenue_brl_cents_30d')) {
        return { rows: [queries.billingPurchases] }
      }
      if (sql.includes('distinct_links')) {
        return { rows: queries.integration as unknown[] }
      }
      throw new Error(`unexpected query: ${sql.slice(0, 80)}`)
    }),
  } as unknown as Pool
}

describe('OpsMetricsPgRepository.businessAnalytics', () => {
  it('maps aggregate rows into business snapshot', async () => {
    const repo = new OpsMetricsPgRepository(mockPool({
      activation: {
        total_accounts: 100,
        accounts_with_patient: 80,
        accounts_with_link: 40,
        accounts_sync_success_7d: 25,
        accounts_onboarding_complete: 70,
      },
      engagement: {
        wau: 20,
        mau: 50,
        dormant_accounts_30d: 10,
      },
      support: {
        open_count: 3,
        triaged_count: 1,
        resolved_7d: 5,
        avg_hours_resolve_7d: 12.34,
        consent_technical_pct: 66.7,
        analysis_pending: 2,
        analysis_completed: 4,
      },
      supportCategories: [{ category: 'technical_bug', count: 2 }],
      billingEvents: {
        checkout_started_7d: 4,
        checkout_completed_7d: 2,
        checkout_started_30d: 10,
        checkout_completed_30d: 6,
      },
      billingEntitlements: { paid_plans: 8 },
      billingPurchases: {
        purchases_completed_30d: 3,
        revenue_brl_cents_30d: 15000,
      },
      integration: [{
        portal_type: 'unimed_bh',
        total_7d: 20,
        success_7d: 18,
        fail_rate_pct: 10,
        distinct_links: 5,
      }],
    }))

    const snapshot = await repo.businessAnalytics()

    expect(snapshot.activation.totalAccounts).toBe(100)
    expect(snapshot.engagement.wauOverMauPct).toBe(40)
    expect(snapshot.support.avgHoursToResolve7d).toBe(12.3)
    expect(snapshot.support.byCategory30d[0].category).toBe('technical_bug')
    expect(snapshot.billing.revenueBrlCents30d).toBe(15000)
    expect(snapshot.integrationHealth7d[0]).toMatchObject({
      portalType: 'unimed_bh',
      failRatePct: 10,
      distinctLinks: 5,
    })
  })
})
