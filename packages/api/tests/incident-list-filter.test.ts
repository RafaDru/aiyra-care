import { describe, expect, it } from 'vitest'
import {
  incidentBoardWhereClause,
  normalizeDefectReferenceCode,
  normalizeIncidentReferenceCode,
  parseOpsReferenceOrUuidQuery,
} from '../src/domain/ops/incident-list-filter.js'

describe('incident-list-filter', () => {
  it('normalizes INC/DEF reference codes', () => {
    expect(normalizeIncidentReferenceCode('inc-000002')).toBe('INC-000002')
    expect(normalizeDefectReferenceCode('def-000001')).toBe('DEF-000001')
    expect(normalizeIncidentReferenceCode('INC-2')).toBeNull()
  })

  it('parses search query kinds', () => {
    expect(parseOpsReferenceOrUuidQuery('INC-000003').kind).toBe('incident_ref')
    expect(parseOpsReferenceOrUuidQuery('DEF-000004').kind).toBe('defect_ref')
    expect(parseOpsReferenceOrUuidQuery('a1b2c3d4').kind).toBe('uuid_prefix')
    expect(parseOpsReferenceOrUuidQuery('wallet sync').kind).toBe('title')
  })

  it('builds distinct SQL filters', () => {
    expect(incidentBoardWhereClause('needs_attention')).toContain('triaged')
    expect(incidentBoardWhereClause('triaged')).toContain("= 'triaged'")
    expect(incidentBoardWhereClause('all_open')).not.toContain('triaged')
  })
})
