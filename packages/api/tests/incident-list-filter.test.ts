import { describe, expect, it } from 'vitest'
import type { AnalysisQueueStatus, IncidentPipelineStatus } from '../src/domain/ops/ops-analysis-queue.types.js'
import {
  incidentBoardWhereClause,
  incidentMatchesBoardFilter,
  normalizeDefectReferenceCode,
  normalizeIncidentReferenceCode,
  parseOpsReferenceOrUuidQuery,
  suggestIncidentBoardFilterFromPipeline,
  type IncidentBoardFilter,
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
    expect(incidentBoardWhereClause('all_open')).toContain('triaged')
    expect(incidentBoardWhereClause('all_open')).toContain('completed')
    expect(incidentBoardWhereClause('resolved')).toContain("= 'resolved'")
  })

  const row = (
    pipeline: IncidentPipelineStatus,
    status: AnalysisQueueStatus = 'queued',
  ) => ({ incidentPipelineStatus: pipeline, status })

  describe('incidentMatchesBoardFilter — all_open', () => {
    const filter: IncidentBoardFilter = 'all_open'

    it('includes active dispatch/triage pipelines only', () => {
      expect(incidentMatchesBoardFilter(row('open'), filter)).toBe(true)
      expect(incidentMatchesBoardFilter(row('in_triage', 'investigating'), filter)).toBe(true)
    })

    it('excludes triaged, resolved, completed, dismissed', () => {
      expect(incidentMatchesBoardFilter(row('triaged'), filter)).toBe(false)
      expect(incidentMatchesBoardFilter(row('resolved', 'completed'), filter)).toBe(false)
      expect(incidentMatchesBoardFilter(row('dismissed', 'dismissed'), filter)).toBe(false)
      expect(incidentMatchesBoardFilter(row('open', 'dismissed'), filter)).toBe(false)
      expect(incidentMatchesBoardFilter(row('triaged', 'completed'), filter)).toBe(false)
    })
  })

  describe('incidentMatchesBoardFilter — needs_attention', () => {
    const filter: IncidentBoardFilter = 'needs_attention'

    it('includes dispatch queue states', () => {
      expect(incidentMatchesBoardFilter(row('open'), filter)).toBe(true)
      expect(incidentMatchesBoardFilter(row('dispatch_failed'), filter)).toBe(true)
    })

    it('excludes triaged, resolved, dismissed', () => {
      expect(incidentMatchesBoardFilter(row('triaged'), filter)).toBe(false)
      expect(incidentMatchesBoardFilter(row('resolved'), filter)).toBe(false)
      expect(incidentMatchesBoardFilter(row('dismissed', 'dismissed'), filter)).toBe(false)
      expect(incidentMatchesBoardFilter(row('open', 'completed'), filter)).toBe(false)
      expect(incidentMatchesBoardFilter(row('open', 'dismissed'), filter)).toBe(false)
    })
  })

  describe('incidentMatchesBoardFilter — triaged / resolved', () => {
    it('triaged chip only triaged pipeline (not legacy dismissed)', () => {
      expect(incidentMatchesBoardFilter(row('triaged'), 'triaged')).toBe(true)
      expect(incidentMatchesBoardFilter(row('triaged', 'dismissed'), 'triaged')).toBe(false)
      expect(incidentMatchesBoardFilter(row('open'), 'triaged')).toBe(false)
    })

    it('resolved chip only resolved pipeline', () => {
      expect(incidentMatchesBoardFilter(row('resolved', 'completed'), 'resolved')).toBe(true)
      expect(incidentMatchesBoardFilter(row('triaged'), 'resolved')).toBe(false)
    })
  })

  describe('suggestIncidentBoardFilterFromPipeline', () => {
    it('maps pipelines to chips', () => {
      expect(suggestIncidentBoardFilterFromPipeline('resolved')).toBe('resolved')
      expect(suggestIncidentBoardFilterFromPipeline('triaged')).toBe('triaged')
      expect(suggestIncidentBoardFilterFromPipeline('open')).toBe('needs_attention')
      expect(suggestIncidentBoardFilterFromPipeline('dismissed')).toBe('all_open')
    })
  })
})
