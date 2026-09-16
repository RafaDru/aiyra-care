import { describe, expect, it, vi } from 'vitest'
import { SupportReportService } from '../src/application/support-report/support-report.service.js'
import { sanitizeSupportClientContext, sanitizeSupportDescription } from '../src/domain/support-report/support-report.types.js'

describe('sanitizeSupportDescription', () => {
  it('trunca e remove vazio', () => {
    expect(sanitizeSupportDescription('  olá  ')).toBe('olá')
    expect(sanitizeSupportDescription('')).toBeNull()
  })
})

describe('sanitizeSupportClientContext', () => {
  it('mantém allowlist e descarta PHI-like keys', () => {
    const out = sanitizeSupportClientContext({
      locale: 'pt-BR',
      message: 'febre',
      active_tab: 'exams',
    })
    expect(out).toEqual({ locale: 'pt-BR', active_tab: 'exams' })
  })
})

describe('SupportReportService.create', () => {
  it('cria relatório mínimo sem bundle técnico', async () => {
    const repo = {
      insert: vi.fn(async (row) => ({
        id: 'rep-1',
        accountId: row.accountId,
        status: 'open',
        category: row.category,
        description: row.description,
        route: row.route ?? null,
        sessionId: row.sessionId ?? null,
        patientId: row.patientId ?? null,
        consentTechnical: row.consentTechnical,
        consentScreenshot: row.consentScreenshot,
        consentProfileAccess: row.consentProfileAccess,
        profileAccessUntil: row.profileAccessUntil,
        diagnosticContext: row.diagnosticContext,
        hasScreenshot: false,
        appVersion: null,
        userAgent: null,
        expiresAt: row.expiresAt,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      fetchRecentProductEvents: vi.fn(),
      fetchRecentClientErrors: vi.fn(),
      fetchLastSyncFailure: vi.fn(),
      listByAccount: vi.fn(),
      findByIdForAccount: vi.fn(),
    }
    const productEvents = { ingest: vi.fn(async () => ({ accepted: 1, rejected: 0 })) }
    const svc = new SupportReportService(repo as never, productEvents as never)

    const record = await svc.create('acc-1', {
      category: 'technical_bug',
      description: 'Tela em branco',
      consentTechnical: false,
      consentScreenshot: false,
      consentProfileAccess: false,
    })

    expect(record.id).toBe('rep-1')
    expect(repo.fetchRecentProductEvents).not.toHaveBeenCalled()
    expect(productEvents.ingest).toHaveBeenCalled()
  })

  it('enriquece diagnóstico quando consentTechnical', async () => {
    const repo = {
      insert: vi.fn(async (row) => ({
        id: 'rep-2',
        accountId: row.accountId,
        status: 'open',
        category: row.category,
        description: row.description,
        route: null,
        sessionId: null,
        patientId: null,
        consentTechnical: true,
        consentScreenshot: false,
        consentProfileAccess: false,
        profileAccessUntil: null,
        diagnosticContext: row.diagnosticContext,
        hasScreenshot: false,
        appVersion: null,
        userAgent: null,
        expiresAt: row.expiresAt,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      fetchRecentProductEvents: vi.fn(async () => [{ eventName: 'onboarding_step' }]),
      fetchRecentClientErrors: vi.fn(async () => [{ fingerprint: 'abc' }]),
      fetchLastSyncFailure: vi.fn(),
      listByAccount: vi.fn(),
      findByIdForAccount: vi.fn(),
    }
    const svc = new SupportReportService(repo as never)

    await svc.create('acc-1', {
      category: 'ux_confusion',
      consentTechnical: true,
      consentScreenshot: false,
      consentProfileAccess: false,
      sessionId: 'sess-1',
    })

    expect(repo.fetchRecentProductEvents).toHaveBeenCalledWith('acc-1', 'sess-1', 15)
    expect(repo.fetchRecentClientErrors).toHaveBeenCalled()
  })
})
