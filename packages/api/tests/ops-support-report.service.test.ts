import { describe, expect, it, vi } from 'vitest'
import { OpsSupportReportService } from '../src/application/ops/ops-support-report.service.js'
import { SupportReportPgRepository } from '../src/infrastructure/persistence/support-report.pg.repository.js'

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
