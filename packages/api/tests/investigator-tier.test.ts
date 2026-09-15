import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { OpsAlert } from '../src/domain/ops/ops-metrics.types.js'
import type { SupportReportRecord } from '../src/domain/support-report/support-report.types.js'
import {
  isTier1Enabled,
  resolveOpsAlertInvestigationTier,
  resolveSupportInvestigationTier,
  tier1PlaybookId,
  TIER1_MAX_CHANGED_FILES,
  TIER1_MAX_CHANGED_LINES,
  TIER1_PATH_ALLOWLIST,
} from '../src/domain/ops/investigator-tier.js'

function supportRecord(overrides: Partial<SupportReportRecord> = {}): SupportReportRecord {
  const now = new Date('2026-09-15T12:00:00.000Z')
  return {
    id: 'sr-1',
    accountId: 'acc-1',
    status: 'open',
    category: 'technical_bug',
    description: 'bug',
    route: '/patients/1',
    sessionId: null,
    patientId: null,
    consentTechnical: true,
    consentScreenshot: false,
    consentProfileAccess: false,
    profileAccessUntil: null,
    diagnosticContext: {},
    hasScreenshot: false,
    appVersion: '1.0',
    userAgent: null,
    expiresAt: now,
    resolvedAt: null,
    analysisStatus: 'none',
    operatorNotes: null,
    analysisSummary: null,
    analysisArtifactPath: null,
    analysisRequestedAt: null,
    analysisCompletedAt: null,
    analysisLastError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function opsAlert(overrides: Partial<OpsAlert> = {}): OpsAlert {
  return {
    id: 'infra_api_down',
    severity: 'critical',
    category: 'infra',
    message: 'API down',
    ...overrides,
  }
}

describe('investigator-tier', () => {
  afterEach(() => {
    delete process.env.OPS_INVESTIGATOR_TIER1
  })

  it('tier 1 disabled by default', () => {
    expect(isTier1Enabled()).toBe(false)
    expect(resolveSupportInvestigationTier(supportRecord(), 'auto')).toBe(0)
    expect(resolveOpsAlertInvestigationTier(opsAlert(), 'manual')).toBe(0)
  })

  it('enables tier 1 when OPS_INVESTIGATOR_TIER1=1', () => {
    process.env.OPS_INVESTIGATOR_TIER1 = '1'
    expect(isTier1Enabled()).toBe(true)
  })

  describe('support lane', () => {
    beforeEach(() => {
      process.env.OPS_INVESTIGATOR_TIER1 = '1'
    })

    it('tier 1 for technical_bug with consent', () => {
      expect(resolveSupportInvestigationTier(supportRecord(), 'auto')).toBe(1)
      expect(resolveSupportInvestigationTier(supportRecord(), 'manual')).toBe(1)
    })

    it('tier 0 without consentTechnical', () => {
      expect(resolveSupportInvestigationTier(supportRecord({ consentTechnical: false }), 'auto')).toBe(0)
    })

    it('tier 0 for non technical_bug', () => {
      expect(resolveSupportInvestigationTier(supportRecord({ category: 'ux_confusion' }), 'auto')).toBe(0)
    })
  })

  describe('sre lane', () => {
    beforeEach(() => {
      process.env.OPS_INVESTIGATOR_TIER1 = '1'
    })

    it('tier 1 manual for infra/sync', () => {
      expect(resolveOpsAlertInvestigationTier(opsAlert({ category: 'infra' }), 'manual')).toBe(1)
      expect(resolveOpsAlertInvestigationTier(opsAlert({ category: 'sync', severity: 'warning' }), 'manual')).toBe(1)
    })

    it('tier 1 auto only for critical infra/sync', () => {
      expect(resolveOpsAlertInvestigationTier(opsAlert({ category: 'infra', severity: 'critical' }), 'auto')).toBe(1)
      expect(resolveOpsAlertInvestigationTier(opsAlert({ category: 'sync', severity: 'critical' }), 'auto')).toBe(1)
      expect(resolveOpsAlertInvestigationTier(opsAlert({ category: 'infra', severity: 'warning' }), 'auto')).toBe(0)
    })

    it('tier 0 for llm category', () => {
      expect(resolveOpsAlertInvestigationTier(opsAlert({ category: 'llm', severity: 'critical' }), 'manual')).toBe(0)
    })
  })

  it('exports tier1 playbook ids and gate constants', () => {
    expect(tier1PlaybookId('development_support')).toBe('support-report-tier1')
    expect(tier1PlaybookId('sre_support')).toBe('ops-alert-tier1')
    expect(TIER1_PATH_ALLOWLIST.length).toBeGreaterThan(0)
    expect(TIER1_MAX_CHANGED_FILES).toBe(8)
    expect(TIER1_MAX_CHANGED_LINES).toBe(200)
  })
})
