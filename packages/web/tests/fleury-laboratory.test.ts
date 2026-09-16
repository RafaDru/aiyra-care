import { describe, it, expect } from 'vitest'
import {
  inferFleuryLabBrandId,
  fleuryLaboratoryDetail,
  parseHermesExamNotesMeta,
  resolveFleuryLabBrand,
} from '../src/lib/fleury-laboratory.ts'

describe('fleury-laboratory', () => {
  it('infers sub-brand from nomeUnidade', () => {
    expect(inferFleuryLabBrandId('Hermes Pardini — Belo Horizonte')).toBe('pardini')
    expect(inferFleuryLabBrandId('Fleury Medicina e Saúde')).toBe('fleury')
    expect(inferFleuryLabBrandId('a+ medicina diagnóstica - Guarulhos')).toBe('a_mais')
    expect(inferFleuryLabBrandId('Labs a+ Barra')).toBe('labs_a')
  })

  it('reads fleuryLabBrand from exam notes meta', () => {
    const notes = 'hermes_pardini:1:2\n{"pedidoId":"1","fleuryLabBrand":"fleury"}'
    expect(parseHermesExamNotesMeta(notes).fleuryLabBrand).toBe('fleury')
    expect(resolveFleuryLabBrand('hermes_pardini', 'Unidade X', notes)?.id).toBe('fleury')
  })

  it('extracts unit detail without brand name', () => {
    const brand = resolveFleuryLabBrand('hermes_pardini', 'Hermes Pardini — BH Centro', null)
    expect(brand?.id).toBe('pardini')
    expect(fleuryLaboratoryDetail('Hermes Pardini — BH Centro', brand)).toBe('BH Centro')
  })
})
