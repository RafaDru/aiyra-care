import { describe, expect, it } from 'vitest'
import {
  buildOpsAlertToast,
  resolveOpsToastIcon,
  sanitizeOpsToastText,
} from '../src/domain/ops/ops-alert-toast.js'

describe('ops-alert-toast', () => {
  it('sanitize removes problematic unicode punctuation', () => {
    expect(sanitizeOpsToastText('API — lenta • test')).toBe('API - lenta - test')
  })

  it('critical sync uses error icon and readable body', () => {
    const toast = buildOpsAlertToast([{
      id: 'sync_stuck_x',
      severity: 'critical',
      category: 'sync',
      message: 'Sync travado (amil) há 45 min',
    }])
    expect(toast.title).toBe('AiyraCare Ops | CRITICO')
    expect(toast.body).toContain('Sync: Sync travado')
    expect(toast.icon).toBe('error')
    expect(toast.body).not.toContain('•')
    expect(toast.body).not.toContain('—')
  })

  it('warning product uses info icon', () => {
    const toast = buildOpsAlertToast([{
      id: 'llm_quota_spike',
      severity: 'warning',
      category: 'product',
      message: '12 bloqueios de franquia Ava (1h)',
    }])
    expect(toast.title).toBe('AiyraCare Ops | AVISO')
    expect(resolveOpsToastIcon([{
      id: 'llm_quota_spike',
      severity: 'warning',
      category: 'product',
      message: 'x',
    }])).toBe('info')
    expect(toast.icon).toBe('info')
  })

  it('multi-alert joins lines with category labels', () => {
    const toast = buildOpsAlertToast([
      {
        id: 'infra_api_down',
        severity: 'critical',
        category: 'infra',
        message: 'API health falhou',
      },
      {
        id: 'llm_cascade_fail',
        severity: 'critical',
        category: 'llm',
        message: 'Ava: 4 falhas em 5 min',
      },
    ])
    expect(toast.icon).toBe('error')
    expect(toast.body).toContain('Infra:')
    expect(toast.body).toContain('Ava:')
  })
})
