import { describe, expect, it, vi } from 'vitest'
import { OpsSupportReportService } from '../src/application/ops/ops-support-report.service.js'

describe('OpsSupportReportService', () => {
  it('maps list rows without diagnostic when consent off', async () => {
    const repo = {
      listForOps: vi.fn(async () => [{
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
        createdAt: new Date('2026-09-04'),
        updatedAt: new Date('2026-09-04'),
      }]),
      updateStatusForOps: vi.fn(),
    }
    const svc = new OpsSupportReportService(repo as never)
    const rows = await svc.list('open')
    expect(rows[0]?.diagnosticContext).toEqual({})
    expect(rows[0]?.descriptionPreview).toBe('Algo quebrou')
  })
})
