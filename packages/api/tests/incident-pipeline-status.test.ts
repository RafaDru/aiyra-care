import { describe, expect, it } from 'vitest'
import {
  buildIncidentDispatchIdempotencyKey,
  incidentPipelineUiBucket,
  incidentPipelineUiLabel,
} from '../src/domain/ops/incident-pipeline-status.js'

describe('incidentPipelineUiBucket', () => {
  it('maps pipeline status to CH buckets', () => {
    expect(incidentPipelineUiBucket('forwarded')).toBe('encaminhado')
    expect(incidentPipelineUiBucket('queued_worker')).toBe('em_fila')
    expect(incidentPipelineUiBucket('in_triage')).toBe('em_triagem')
    expect(incidentPipelineUiBucket('open')).toBe('aberto')
    expect(incidentPipelineUiBucket('dispatch_failed')).toBe('falha')
  })

  it('falls back to legacy queue status', () => {
    expect(incidentPipelineUiBucket(undefined, 'investigating')).toBe('em_triagem')
    expect(incidentPipelineUiBucket(undefined, 'queued')).toBe('aberto')
    expect(incidentPipelineUiBucket('triaged', 'fix_proposed')).toBe('aberto')
  })

  it('labels PT', () => {
    expect(incidentPipelineUiLabel('encaminhado')).toBe('Encaminhado')
    expect(incidentPipelineUiLabel('falha')).toBe('Falha')
  })
})

describe('buildIncidentDispatchIdempotencyKey', () => {
  it('combines incident id and dispatch kind', () => {
    expect(buildIncidentDispatchIdempotencyKey('abc', 'triage_v1')).toBe('abc:triage_v1')
  })
})
