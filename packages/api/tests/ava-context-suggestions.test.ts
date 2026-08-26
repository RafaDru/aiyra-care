import { describe, expect, it } from 'vitest'
import { AvaContextSuggestionsService } from '../src/application/llm/ava-context-suggestions.service.js'
import { Patient } from '../src/domain/patient/patient.entity.js'

describe('AvaContextSuggestionsService', () => {
  it('returns patient, exams and threads suggestions', async () => {
    const patient = Patient.create({
      name: 'Luís Silva',
      birthDate: new Date('2020-01-15'),
      gender: 'male',
    }, 'pat-1')
    const patients = { findById: async () => patient }
    const exams = { findAll: async () => [{ id: 'e1' }] }
    const healthThreads = {
      findAll: async () => [{
        id: 't1',
        title: 'Febre',
        patientId: 'pat-1',
        kind: 'task',
        status: 'active',
      }],
    }
    const svc = new AvaContextSuggestionsService(
      patients as never,
      exams as never,
      healthThreads as never,
    )
    const items = await svc.listForPatient('pat-1')
    expect(items.map((i) => i.kind)).toEqual(['patient', 'recent_exams', 'health_threads'])
    expect(items[0]?.message).toContain('Luís Silva')
    expect(items[2]?.message).toContain('Febre')
  })
})
