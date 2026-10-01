import { describe, expect, it } from 'vitest'
import {
  preScreenOpsAlert,
  preScreenSupportReport,
} from '../src/domain/ops/ops-analysis-pre-screen.js'

const baseReport = {
  id: 'rep-1',
  accountId: 'a',
  status: 'open' as const,
  category: 'technical_bug',
  description: null,
  route: '/',
  sessionId: null,
  patientId: null,
  consentTechnical: true,
  consentScreenshot: false,
  consentProfileAccess: false,
  profileAccessUntil: null,
  diagnosticContext: {},
  hasScreenshot: false,
  appVersion: null,
  userAgent: null,
  expiresAt: new Date(),
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ops-analysis-pre-screen', () => {
  it('dismisses smoke simulate reports on auto', () => {
    const result = preScreenSupportReport({ ...baseReport, id: 'sim-abc' }, 'auto')
    expect(result.outcome).toBe('dismiss')
  })

  it('always proceeds on manual', () => {
    const result = preScreenSupportReport({ ...baseReport, id: 'sim-abc' }, 'manual')
    expect(result.outcome).toBe('proceed')
  })

  it('defers other category without technical bundle', () => {
    const result = preScreenSupportReport(
      { ...baseReport, category: 'other', consentTechnical: false },
      'auto',
    )
    expect(result.outcome).toBe('defer')
  })

  it('dismisses smoke ops alert id', () => {
    const result = preScreenOpsAlert(
      { id: 'sim_infra_down', severity: 'critical', category: 'infra', message: 'x', detectedAt: '2026-01-01T00:00:00.000Z' },
      'auto',
    )
    expect(result.outcome).toBe('dismiss')
  })
})
