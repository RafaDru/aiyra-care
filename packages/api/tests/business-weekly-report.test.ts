import { describe, expect, it } from 'vitest'
import { buildBusinessWeeklyReportMarkdown } from '../src/domain/ops/business-weekly-report.js'
import type { OpsBusinessAnalytics } from '../src/domain/ops/ops-metrics.types.js'

const sample: OpsBusinessAnalytics = {
  totals: {
    accounts: 100,
    patients: 250,
    families: 40,
    familyMemberAccounts: 55,
    newAccounts30d: 12,
    newPatients30d: 18,
    newFamilies30d: 3,
  },
  growthDaily30d: [],
  activation: {
    totalAccounts: 100,
    accountsWithPatient: 80,
    accountsWithIntegrationLink: 40,
    accountsWithSyncSuccess7d: 25,
    accountsOnboardingComplete: 70,
  },
  engagement: { wau: 20, mau: 50, wauOverMauPct: 40, dormantAccounts30d: 10 },
  topFeatures30d: [],
  ava: {
    started30d: 50,
    completed30d: 40,
    failed30d: 8,
    quotaBlocked30d: 2,
    unresolved30d: 10,
    successRatePct: 80,
    failures: [],
    proposedActions: [],
    daily30d: [],
  },
  composition: { activeDomains30d: [] },
  support: {
    openCount: 3,
    triagedCount: 1,
    resolved7d: 5,
    avgHoursToResolve7d: 12.3,
    consentTechnicalPct: 66.7,
    analysisPending: 2,
    analysisCompleted: 4,
    byCategory30d: [{ category: 'technical_bug', count: 2 }],
  },
  billing: {
    checkoutStarted7d: 4,
    checkoutCompleted7d: 2,
    checkoutStarted30d: 10,
    checkoutCompleted30d: 6,
    paidPlans: 8,
    purchasesCompleted30d: 3,
    revenueBrlCents30d: 15000,
  },
  integrationHealth7d: [
    { portalType: 'unimed_bh', total7d: 20, success7d: 18, failRatePct: 10, distinctLinks: 5 },
  ],
}

describe('business-weekly-report', () => {
  it('renders markdown sections without PHI', () => {
    const md = buildBusinessWeeklyReportMarkdown(sample, '2026-09-11T18:00:00.000Z')
    expect(md).toContain('# AiyraCare — relatório semanal de negócio')
    expect(md).toContain('WAU: **20**')
    expect(md).toContain('unimed_bh')
    expect(md).toContain('R$ 150,00')
    expect(md).toContain('technical_bug: 2')
  })
})
