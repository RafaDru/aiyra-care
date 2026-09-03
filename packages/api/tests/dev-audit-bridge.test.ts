import { describe, expect, it } from 'vitest'
import {
  buildDevAuditBridgeReport,
  buildHourlyCorrelation,
  classifyDevAuditArea,
  hourBucket,
  parseDevAuditJsonlLine,
} from '../src/domain/ops/dev-audit-bridge.js'
import type { DevAuditRecord } from '../src/domain/ops/dev-audit-bridge.types.js'

describe('dev-audit-bridge', () => {
  it('classifica área por path', () => {
    expect(classifyDevAuditArea('packages/api/src/index.ts')).toBe('api')
    expect(classifyDevAuditArea('packages/web/src/App.tsx')).toBe('web')
    expect(classifyDevAuditArea('docs/HISTORICO.md')).toBe('docs')
  })

  it('parseia linha jsonl', () => {
    const rec = parseDevAuditJsonlLine(
      JSON.stringify({ ts: '2026-09-03T12:00:00.000Z', event: 'preToolUse', path: 'packages/api/x.ts' }),
      'tools',
    )
    expect(rec?.kind).toBe('tools')
    expect(rec?.path).toContain('packages/api')
  })

  it('correlaciona horas com atividade alinhada', () => {
    const hour = hourBucket('2026-09-03T14:30:00.000Z')
    const audit: DevAuditRecord[] = [
      { ts: '2026-09-03T14:10:00.000Z', kind: 'edits', event: 'afterFileEdit', path: 'packages/web/a.ts' },
      { ts: '2026-09-03T14:20:00.000Z', kind: 'edits', event: 'afterFileEdit', path: 'packages/web/b.ts' },
      { ts: '2026-09-03T14:25:00.000Z', kind: 'tools', event: 'preToolUse', path: 'packages/web/c.ts' },
    ]
    const productHourly = [{ hour, count: 5 }]
    const correlation = buildHourlyCorrelation(audit, productHourly)
    expect(correlation.alignedHours).toBe(1)
    expect(correlation.peakAuditHour).toBe(hour)
  })

  it('monta relatório sem PHI', () => {
    const report = buildDevAuditBridgeReport({
      windowHours: 24,
      deploymentTier: 'preview',
      auditRecords: [
        { ts: '2026-09-03T10:00:00.000Z', kind: 'sessions', event: 'sessionStart' },
      ],
      productByName: { ava_chat_completed: 2 },
      productHourly: [{ hour: '2026-09-03T10:00:00.000Z', count: 2 }],
    })
    expect(report.deploymentTier).toBe('preview')
    expect(report.audit.sessions).toBe(1)
    expect(report.productEvents.total).toBe(2)
    expect(JSON.stringify(report)).not.toMatch(/patient|cpf|diagnos/i)
    expect(report.hints.length).toBeGreaterThan(0)
  })
})
