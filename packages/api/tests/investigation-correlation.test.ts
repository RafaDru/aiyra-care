import { describe, expect, it } from 'vitest'
import {
  buildOpsConsoleUrl,
  formatInvestigationIdShort,
  resolveInvestigationIdFromCallback,
  resolveInvestigationIdFromPayload,
} from '../src/domain/ops/investigation-correlation.js'

describe('investigation-correlation', () => {
  it('prefers investigationId over queueId in callback', () => {
    expect(resolveInvestigationIdFromCallback({
      investigationId: 'inv-primary',
      queueId: 'queue-legacy',
    })).toBe('inv-primary')
    expect(resolveInvestigationIdFromCallback({ queueId: 'queue-legacy' })).toBe('queue-legacy')
  })

  it('resolves from payload investigationId or analysisQueue.id', () => {
    expect(resolveInvestigationIdFromPayload({
      investigationId: 'top-level',
      analysisQueue: { id: 'nested' },
    })).toBe('top-level')
    expect(resolveInvestigationIdFromPayload({
      analysisQueue: { id: 'nested-only' },
    })).toBe('nested-only')
  })

  it('builds console deep links', () => {
    const url = buildOpsConsoleUrl('http://127.0.0.1:3013', {
      tab: 'issues',
      investigationId: 'uuid-123',
      reportId: 'rep-1',
    })
    expect(url).toContain('tab=issues')
    expect(url).toContain('investigationId=uuid-123')
    expect(url).toContain('reportId=rep-1')
  })

  it('formats short id', () => {
    expect(formatInvestigationIdShort('abcdef12-3456')).toBe('abcdef12')
  })
})
