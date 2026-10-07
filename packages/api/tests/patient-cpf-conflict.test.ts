import { describe, expect, it } from 'vitest'
import { Patient } from '../src/domain/patient/patient.entity.js'
import type { PatientRepository } from '../src/domain/patient/patient.repository.js'
import {
  CPF_ALREADY_LINKED_CODE,
  PatientService,
} from '../src/application/patient/patient.service.js'
import { ConflictError } from '../src/domain/errors.js'

class InMemoryPatientRepo implements PatientRepository {
  patients = new Map<string, Patient>()

  async findById(id: string) {
    return this.patients.get(id) ?? null
  }

  async findByCpf(cpf: string) {
    for (const patient of this.patients.values()) {
      if (patient.cpf === cpf) return patient
    }
    return null
  }

  async findAll() {
    return [...this.patients.values()]
  }

  async findByIds(ids: readonly string[]) {
    return ids.map((id) => this.patients.get(id)).filter((p): p is Patient => Boolean(p))
  }

  async save(patient: Patient) {
    this.patients.set(patient.id, patient)
    return patient
  }

  async update(patient: Patient) {
    this.patients.set(patient.id, patient)
    return patient
  }

  async getOwnerAccountId() {
    return null
  }

  async listOwnerAccountIds() {
    return new Map<string, string>()
  }

  async setOwnerAccountId() {
    return undefined
  }

  async findAllByHousehold() {
    return []
  }

  async delete() {
    return undefined
  }
}

describe('PatientService.create — CPF duplicado', () => {
  it('rejects create when CPF already linked', async () => {
    const repo = new InMemoryPatientRepo()
    const existing = Patient.create({
      name: 'Titular',
      birthDate: new Date('1990-01-01'),
      cpf: '12345678901',
    })
    await repo.save(existing)

    const service = new PatientService(repo)

    await expect(
      service.create({
        name: 'Outro',
        birthDate: new Date('1991-01-01'),
        cpf: '12345678901',
      }),
    ).rejects.toMatchObject({
      name: 'ConflictError',
      code: CPF_ALREADY_LINKED_CODE,
    } satisfies Partial<ConflictError>)
  })
})
