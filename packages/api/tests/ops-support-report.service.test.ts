import { describe, expect, it, vi } from 'vitest'
import { OpsSupportReportService } from '../src/application/ops/ops-support-report.service.js'
import { SupportReportPgRepository } from '../src/infrastructure/persistence/support-report.pg.repository.js'

const baseRow = {
  id: 'r1',
  accountId: 'acc-1',
  status: 'open' as const,
  category: 'technical_bug' as const,
  description: 'Algo quebrou',
  route: '/patients/x',
  sessionId: null,
  patientId: null,
  consentTechnical: false,
  consentScreenshot: false,
  consentProfileAccess: false,
  profileAccessUntil: null,
  diagnosticContext: { secret: 'x' },
  hasScreenshot: false,
  appVersion: '0.1.0',
  userAgent: null,
  expiresAt: new Date('2026-10-01'),
  resolvedAt: null,
  analysisStatus: 'none' as const,
  operatorNotes: null,
  analysisSummary: null,
  analysisArtifactPath: null,
  analysisRequestedAt: null,
  analysisCompletedAt: null,
  analysisLastError: null,
  suggestedCategory: null,
  categoryReviewNote: null,
  taxonomyGapProposal: null,
  deploymentStatus: 'none' as const,
  deploymentActions: [],
  createdAt: new Date('2026-09-04'),
  updatedAt: new Date('2026-09-04'),
}

describe('OpsSupportReportService', () => {
  it('maps list rows without diagnostic when consent off', async () => {
    const repo = {
      listForOps: vi.fn(async () => [baseRow]),
      updateStatusForOps: vi.fn(),
    }
    const svc = new OpsSupportReportService(repo as never)
    const rows = await svc.list('open')
    expect(rows[0]?.diagnosticContext).toEqual({})
    expect(rows[0]?.descriptionPreview).toBe('Algo quebrou')
    expect(rows[0]?.analysisStatus).toBe('none')
  })

  it('requestAnalysis returns unavailable when webhook skipped', async () => {
    const repo = {
      findByIdForOps: vi.fn(async () => baseRow),
      updateOperatorNotesForOps: vi.fn(async () => true),
      updateAnalysisStateForOps: vi.fn(async () => true),
    }
    const svc = new OpsSupportReportService(repo as never)
    const result = await svc.requestAnalysis('r1', 'contexto ops')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('investigator_unavailable')
    expect(repo.updateAnalysisStateForOps).toHaveBeenCalled()
  })
})

describe('SupportReportPgRepository.listForOps', () => {
  it('falls back to migration-061 columns when analysis columns are missing', async () => {
    const baseRow = {
      id: '11111111-1111-1111-1111-111111111111',
      account_id: '22222222-2222-2222-2222-222222222222',
      status: 'open',
      category: 'technical_bug',
      description: 'x',
      route: '/',
      session_id: null,
      patient_id: null,
      consent_technical: true,
      consent_screenshot: false,
      consent_profile_access: false,
      profile_access_until: null,
      diagnostic_context: {},
      screenshot_data: false,
      app_version: null,
      user_agent: null,
      expires_at: new Date().toISOString(),
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const query = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('column "analysis_status" does not exist'), { code: '42703' }))
      .mockResolvedValueOnce({ rows: [baseRow] })
    const repo = new SupportReportPgRepository({ query } as never)
    const rows = await repo.listForOps('open', 10)
    expect(query).toHaveBeenCalledTimes(2)
    expect(rows[0]?.analysisStatus).toBe('none')
    expect(rows[0]?.deploymentStatus).toBe('none')
  })
})

describe('SupportReportPgRepository.updateStatusForOps', () => {
  it('casts status param to varchar for Postgres CASE', async () => {
    const query = vi.fn(async () => ({ rowCount: 1 }))
    const repo = new SupportReportPgRepository({ query } as never)
    const ok = await repo.updateStatusForOps('11111111-1111-1111-1111-111111111111', 'triaged')
    expect(ok).toBe(true)
    expect(query).toHaveBeenCalledOnce()
    const sql = String(query.mock.calls[0][0])
    expect(sql).toContain('$2::varchar')
    expect(sql).toContain('$1::uuid')
  })
})
