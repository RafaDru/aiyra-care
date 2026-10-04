import { describe, expect, it } from 'vitest'
import {
  extractIncidentFingerprint,
  INCIDENT_RECURRENCE_KIND_REINCIDENCIA,
} from '../src/domain/ops/incident-recurrence.js'

describe('incident recurrence domain', () => {
  it('extracts fingerprint from context snapshot', () => {
    expect(extractIncidentFingerprint({ fingerprint: 'abc' })).toBe('abc')
    expect(extractIncidentFingerprint({})).toBeNull()
  })

  it('uses stable recurrence kind reincidencia', () => {
    expect(INCIDENT_RECURRENCE_KIND_REINCIDENCIA).toBe('reincidencia')
  })
})
