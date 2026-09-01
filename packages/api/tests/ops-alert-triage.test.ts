import { describe, expect, it } from 'vitest'
import { triageOpsAlert, triageOpsAlerts, filterAlertsForDispatch } from '../src/domain/ops/ops-alert-triage.js'
import type { OpsAlert } from '../src/domain/ops/ops-metrics.types.js'

function alert(partial: Partial<OpsAlert> & Pick<OpsAlert, 'id' | 'severity' | 'category' | 'message'>): OpsAlert {
  return { ...partial }
}

describe('triageOpsAlert', () => {
  it('marks critical infra as human required', () => {
    const row = triageOpsAlert(alert({
      id: 'infra_api_down',
      severity: 'critical',
      category: 'infra',
      message: 'down',
    }))
    expect(row.tier).toBe('infra')
    expect(row.humanRequired).toBe(true)
  })

  it('does not pager slow infra warnings', () => {
    const row = triageOpsAlert(alert({
      id: 'infra_postgres_slow',
      severity: 'warning',
      category: 'infra',
      message: 'slow',
    }))
    expect(row.humanRequired).toBe(false)
  })

  it('does not pager quota spike', () => {
    const row = triageOpsAlert(alert({
      id: 'llm_quota_spike',
      severity: 'warning',
      category: 'product',
      message: 'quota',
    }))
    expect(row.humanRequired).toBe(false)
  })

  it('marks llm cascade critical as human required', () => {
    const row = triageOpsAlert(alert({
      id: 'llm_cascade_fail',
      severity: 'critical',
      category: 'llm',
      message: 'cascade',
    }))
    expect(row.humanRequired).toBe(true)
  })
})

describe('filterAlertsForDispatch', () => {
  it('human_required mode keeps only human alerts', () => {
    const alerts = [
      alert({ id: 'llm_cascade_fail', severity: 'critical', category: 'llm', message: 'c' }),
      alert({ id: 'llm_quota_spike', severity: 'warning', category: 'product', message: 'q' }),
    ]
    const filtered = filterAlertsForDispatch(alerts, 'human_required')
    expect(filtered.map((a) => a.id)).toEqual(['llm_cascade_fail'])
  })

  it('all mode keeps every alert', () => {
    const alerts = triageOpsAlerts([
      alert({ id: 'llm_quota_spike', severity: 'warning', category: 'product', message: 'q' }),
    ])
    expect(filterAlertsForDispatch(
      [{ id: 'llm_quota_spike', severity: 'warning', category: 'product', message: 'q' }],
      'all',
    ).length).toBe(1)
    expect(alerts[0].humanRequired).toBe(false)
  })
})
