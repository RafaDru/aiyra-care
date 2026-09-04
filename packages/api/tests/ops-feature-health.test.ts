import { describe, expect, it } from 'vitest'
import {
  deriveFeatureKeyFromRoute,
  resolveFeatureKeyFromProductEvent,
  resolveOpsFeatureLabel,
} from '../src/domain/ops/ops-feature-catalog.js'
import { buildFeatureHealthMatrix } from '../src/domain/ops/ops-feature-health.js'

describe('ops-feature-catalog', () => {
  it('maps routes to feature keys', () => {
    expect(deriveFeatureKeyFromRoute('/')).toBe('dashboard')
    expect(deriveFeatureKeyFromRoute('/patients/abc')).toBe('patient_detail')
    expect(deriveFeatureKeyFromRoute('/settings/plan')).toBe('billing')
    expect(deriveFeatureKeyFromRoute('/settings/family')).toBe('settings_family')
    expect(deriveFeatureKeyFromRoute('/invite/accept')).toBe('family_invite')
  })

  it('maps product events to features', () => {
    expect(resolveFeatureKeyFromProductEvent('ava_chat_failed')).toBe('api:ava')
    expect(resolveFeatureKeyFromProductEvent('sync_job_terminal')).toBe('api:integration_links')
    expect(resolveFeatureKeyFromProductEvent('sync_job_started')).toBe('api:integration_links')
    expect(resolveFeatureKeyFromProductEvent('app_screen_viewed', '/settings/family')).toBe('settings_family')
    expect(resolveFeatureKeyFromProductEvent('landing_page_view', '/')).toBe('app')
  })

  it('humanizes labels', () => {
    expect(resolveOpsFeatureLabel('patient_detail')).toBe('Perfil do paciente')
    expect(resolveOpsFeatureLabel('api:ava')).toBe('Ava (chat)')
    expect(resolveOpsFeatureLabel('api:patients:exams')).toContain('Exames')
  })
})

describe('buildFeatureHealthMatrix', () => {
  it('computes fail rate and hot signal', () => {
    const rows = buildFeatureHealthMatrix(
      [
        {
          route: '/patients/x',
          eventName: 'ava_chat_completed',
          eventCount: 20,
          sessionCount: 10,
        },
      ],
      [{ feature: 'api:ava', errorCount: 5, accountCount: 2 }],
      resolveFeatureKeyFromProductEvent,
    )
    const ava = rows.find((r) => r.featureKey === 'api:ava')
    expect(ava?.failRatePct).toBe(50)
    expect(ava?.signal).toBe('hot')
    expect(ava?.label).toBe('Ava (chat)')
  })

  it('flags errors without usage', () => {
    const rows = buildFeatureHealthMatrix(
      [],
      [{ feature: 'billing', errorCount: 2, accountCount: 1 }],
      resolveFeatureKeyFromProductEvent,
    )
    expect(rows[0].signal).toBe('errors_only')
    expect(rows[0].failRatePct).toBe(100)
  })
})
