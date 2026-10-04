import { describe, expect, it } from 'vitest'
import {
  incidentFollowsDefectFixed,
  resolveRecurrenceParentId,
} from '../src/domain/ops/platform-defect-recurrence.js'

describe('platform-defect-recurrence', () => {
  it('detects incident after fixed_at', () => {
    expect(
      incidentFollowsDefectFixed('2026-10-05T00:00:00.000Z', '2026-10-04T12:00:00.000Z'),
    ).toBe(true)
    expect(
      incidentFollowsDefectFixed('2026-10-04T00:00:00.000Z', '2026-10-04T12:00:00.000Z'),
    ).toBe(false)
  })

  it('links fingerprint match to latest fixed parent', () => {
    const parentId = resolveRecurrenceParentId({
      incidentSeenAt: '2026-10-05T00:00:00.000Z',
      fixedByFingerprint: { id: 'parent-1', fixedAt: '2026-10-04T00:00:00.000Z' },
      explicitParentId: null,
      explicitParent: null,
    })
    expect(parentId).toBe('parent-1')
  })

  it('uses explicit parentDefectId when triador correlates', () => {
    const parentId = resolveRecurrenceParentId({
      incidentSeenAt: '2026-10-05T00:00:00.000Z',
      fixedByFingerprint: null,
      explicitParentId: 'parent-2',
      explicitParent: { id: 'parent-2', status: 'fixed', fixedAt: '2026-10-01T00:00:00.000Z' },
    })
    expect(parentId).toBe('parent-2')
  })

  it('returns null when incident predates fixed_at', () => {
    const parentId = resolveRecurrenceParentId({
      incidentSeenAt: '2026-10-01T00:00:00.000Z',
      fixedByFingerprint: { id: 'parent-1', fixedAt: '2026-10-04T00:00:00.000Z' },
      explicitParentId: null,
      explicitParent: null,
    })
    expect(parentId).toBeNull()
  })
})
