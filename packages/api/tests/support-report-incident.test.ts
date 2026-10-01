import { describe, expect, it } from 'vitest'
import { inferSupportReportApplication } from '../src/domain/support-report/support-report-incident.js'
import type { SupportReportRecord } from '../src/domain/support-report/support-report.types.js'

function baseRecord(overrides: Partial<SupportReportRecord> = {}): SupportReportRecord {
  return {
    id: 'r1',
    accountId: 'a1',
    status: 'open',
    category: 'technical_bug',
    description: null,
    route: '/wallet',
    sessionId: null,
    patientId: null,
    consentTechnical: false,
    consentScreenshot: false,
    consentProfileAccess: false,
    profileAccessUntil: null,
    diagnosticContext: {},
    hasScreenshot: false,
    appVersion: null,
    userAgent: null,
    expiresAt: new Date(),
    resolvedAt: null,
    analysisStatus: 'none',
    operatorNotes: null,
    analysisSummary: null,
    analysisArtifactPath: null,
    analysisRequestedAt: null,
    analysisCompletedAt: null,
    analysisLastError: null,
    suggestedCategory: null,
    categoryReviewNote: null,
    taxonomyGapProposal: null,
    deploymentStatus: 'none',
    deploymentActions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('inferSupportReportApplication', () => {
  it('detecta Android pelo user-agent', () => {
    expect(
      inferSupportReportApplication(baseRecord({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })),
    ).toBe('Android')
  })

  it('default Web', () => {
    expect(inferSupportReportApplication(baseRecord())).toBe('Web')
  })
})
