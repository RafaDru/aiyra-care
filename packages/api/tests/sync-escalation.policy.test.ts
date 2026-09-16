import { describe, expect, it } from 'vitest'
import {
  shouldEscalateSyncFailures,
  shouldNotifyEscalation,
  SYNC_ESCALATION_COOLDOWN_MS,
  SYNC_ESCALATION_MIN_FAILURES_24H,
} from '../src/domain/user-escalation/sync-escalation.policy.js'

describe('sync-escalation.policy', () => {
  it('exige falhas mínimas em 24h', () => {
    expect(SYNC_ESCALATION_MIN_FAILURES_24H).toBeGreaterThanOrEqual(2)
    expect(shouldEscalateSyncFailures(SYNC_ESCALATION_MIN_FAILURES_24H - 1)).toBe(false)
    expect(shouldEscalateSyncFailures(SYNC_ESCALATION_MIN_FAILURES_24H)).toBe(true)
  })

  it('respeita cooldown entre notificações', () => {
    const now = Date.now()
    const recent = new Date(now - SYNC_ESCALATION_COOLDOWN_MS + 1000)
    expect(shouldNotifyEscalation(null, now)).toBe(true)
    expect(shouldNotifyEscalation(recent, now)).toBe(false)
    expect(shouldNotifyEscalation(new Date(now - SYNC_ESCALATION_COOLDOWN_MS - 1), now)).toBe(true)
  })
})
