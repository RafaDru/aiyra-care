import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { OpsMetricsPgRepository } from '../src/infrastructure/persistence/ops-metrics.pg.repository.js'

function mockPool(): Pool {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('total_patients')) {
        return {
          rows: [{
            total_accounts: 100,
            total_patients: 250,
            total_families: 40,
            family_member_accounts: 55,
            new_accounts_30d: 12,
            new_patients_30d: 18,
            new_families_30d: 3,
          }],
        }
      }
      if (sql.includes('generate_series') && sql.includes('new_families')) {
        return {
          rows: [{
            day: '2026-09-01',
            new_accounts: 2,
            new_patients: 3,
            new_families: 1,
          }],
        }
      }
      if (sql.includes('accounts_with_link')) {
        return {
          rows: [{
            total_accounts: 100,
            accounts_with_patient: 80,
            accounts_with_link: 40,
            accounts_sync_success_7d: 25,
            accounts_onboarding_complete: 70,
          }],
        }
      }
      if (sql.includes('dormant_accounts_30d')) {
        return { rows: [{ wau: 20, mau: 50, dormant_accounts_30d: 10 }] }
      }
      if (sql.includes('feature_key')) {
        return {
          rows: [{
            feature_key: 'patient_detail',
            event_count: 120,
            session_count: 45,
            account_count: 30,
          }],
        }
      }
      if (sql.includes('started_30d')) {
        return {
          rows: [{
            started_30d: 50,
            completed_30d: 40,
            failed_30d: 8,
            quota_blocked_30d: 2,
          }],
        }
      }
      if (sql.includes('ava_chat_failed') && sql.includes('error_code')) {
        return {
          rows: [{
            error_code: 'NETWORK_ERROR',
            count: 5,
            last_seen_at: '2026-09-08T12:00:00.000Z',
          }],
        }
      }
      if (sql.includes('ava_proposed_action_executed')) {
        return {
          rows: [{
            action_type: 'clinical_export',
            count: 4,
            ok_count: 3,
          }],
        }
      }
      if (sql.includes('unresolved') && sql.includes('generate_series')) {
        return {
          rows: [{
            day: '2026-09-01',
            started: 5,
            completed: 4,
            unresolved: 1,
          }],
        }
      }
      if (sql.includes('ava_turn_recorded') && sql.includes('intent_bucket')) {
        return {
          rows: [{
            intent: 'exam',
            turns: 10,
            unsatisfactory: 2,
            needs_full_context: 1,
            revised: 3,
          }],
        }
      }
      if (sql.includes('ava_proposed_action_shown')) {
        return { rows: [{ shown: 8, executed: 4, failed: 1 }] }
      }
      if (sql.includes('reflection_severity')) {
        return { rows: [{ severity: 'ok', count: 7 }, { severity: 'minor', count: 3 }] }
      }
      if (sql.includes('turns_recorded')) {
        return { rows: [{ turns_recorded: 10 }] }
      }
      if (sql.includes('data_domain_generations')) {
        return {
          rows: [{
            domain: 'exams',
            scopes_touched: 30,
            patients_touched: 12,
          }],
        }
      }
      if (sql.includes('analysis_pending')) {
        return {
          rows: [{
            open_count: 3,
            triaged_count: 1,
            resolved_7d: 5,
            avg_hours_resolve_7d: 12.34,
            consent_technical_pct: 66.7,
            analysis_pending: 2,
            analysis_completed: 4,
          }],
        }
      }
      if (sql.includes('GROUP BY category')) {
        return { rows: [{ category: 'technical_bug', count: 2 }] }
      }
      if (sql.includes('checkout_started_7d')) {
        return {
          rows: [{
            checkout_started_7d: 4,
            checkout_completed_7d: 2,
            checkout_started_30d: 10,
            checkout_completed_30d: 6,
          }],
        }
      }
      if (sql.includes('paid_plans')) {
        return { rows: [{ paid_plans: 8 }] }
      }
      if (sql.includes('revenue_brl_cents_30d')) {
        return { rows: [{ purchases_completed_30d: 3, revenue_brl_cents_30d: 15000 }] }
      }
      if (sql.includes('distinct_links')) {
        return {
          rows: [{
            portal_type: 'unimed_bh',
            total_7d: 20,
            success_7d: 18,
            fail_rate_pct: 10,
            distinct_links: 5,
          }],
        }
      }
      throw new Error(`unexpected query: ${sql.slice(0, 100)}`)
    }),
  } as unknown as Pool
}

describe('OpsMetricsPgRepository.businessAnalytics', () => {
  it('maps aggregate rows into business snapshot', async () => {
    const repo = new OpsMetricsPgRepository(mockPool())
    const snapshot = await repo.businessAnalytics()

    expect(snapshot.totals.patients).toBe(250)
    expect(snapshot.totals.newFamilies30d).toBe(3)
    expect(snapshot.growthDaily30d[0].newAccounts).toBe(2)
    expect(snapshot.topFeatures30d[0].featureKey).toBe('patient_detail')
    expect(snapshot.ava.unresolved30d).toBe(10)
    expect(snapshot.ava.successRatePct).toBe(80)
    expect(snapshot.ava.learning.turnsRecorded30d).toBe(10)
    expect(snapshot.ava.learning.intentBreakdown30d[0].intent).toBe('exam')
    expect(snapshot.ava.failures[0].errorCode).toBe('NETWORK_ERROR')
    expect(snapshot.composition.activeDomains30d[0].domain).toBe('exams')
    expect(snapshot.engagement.wauOverMauPct).toBe(40)
    expect(snapshot.integrationHealth7d[0].portalType).toBe('unimed_bh')
  })
})
