import { describe, expect, it } from 'vitest'
import {
  normalizeDoctorKey,
  normalizeProcedureKey,
} from '../src/infrastructure/graph/import-lineage-graph.projector.js'

describe('import-lineage-graph.projector helpers', () => {
  it('normalizeDoctorKey uses council when present', () => {
    expect(normalizeDoctorKey('Dr. Silva', 'CRM 12345')).toBe('doctor:CRM 12345:dr._silva')
  })

  it('normalizeDoctorKey without council', () => {
    expect(normalizeDoctorKey('Maria Santos', null)).toBe('doctor:maria_santos')
  })

  it('normalizeDoctorKey returns null for empty name', () => {
    expect(normalizeDoctorKey('', 'CRM')).toBeNull()
  })

  it('normalizeProcedureKey prefers code', () => {
    expect(normalizeProcedureKey('40301010', 'Hemograma')).toBe('procedure:40301010')
  })

  it('normalizeProcedureKey falls back to description slug', () => {
    expect(normalizeProcedureKey(null, 'Glicemia')).toBe('procedure:glicemia')
  })
})
