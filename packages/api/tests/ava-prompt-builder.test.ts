import { describe, expect, it, vi } from 'vitest'
import { AvaPatientContextService } from '../src/application/llm/ava-patient-context.service.js'
import { Patient } from '../src/domain/patient/patient.entity.js'

function makePatient() {
  return Patient.create({
    name: 'Luís',
    birthDate: new Date('2020-01-15'),
    gender: 'male',
  }, 'pat-1')
}

describe('AvaPatientContextService compact prompt', () => {
  it('minimal block is shorter than full and marks compact mode', async () => {
    const patient = makePatient()
    const patients = { findById: vi.fn(async () => patient) }
    const empty = {
      findAll: vi.fn(async () => []),
      findObservations: vi.fn(async () => []),
    }
    const measurements = { findObservations: vi.fn(async () => []) }
    const exams = {
      findAll: vi.fn(async () => [{
        id: 'e1',
        patientId: 'pat-1',
        examType: 'Hemograma',
        examDate: new Date(),
        resultSummary: 'x'.repeat(800),
      }]),
    }
    const svc = new AvaPatientContextService(
      patients as never,
      exams as never,
      empty as never,
      empty as never,
      empty as never,
      empty as never,
      empty as never,
      empty as never,
      empty as never,
      empty as never,
      measurements as never,
    )
    const full = await svc.buildContextBlock('pat-1')
    const minimal = await svc.buildMinimalContextBlock('pat-1')
    expect(minimal.block).toContain('Modo compacto')
    expect(minimal.block.length).toBeLessThan(full.block.length)
  })
})
