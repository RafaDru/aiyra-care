import { describe, expect, it } from 'vitest'
import { Patient, type PatientData } from '../src/domain/patient/patient.entity.js'
import type { PatientRepository } from '../src/domain/patient/patient.repository.js'
import { PatientService } from '../src/application/patient/patient.service.js'
import { NotFoundError } from '../src/domain/errors.js'

class InMemoryPatientRepo implements PatientRepository {
  patients = new Map<string, Patient>()
  owners = new Map<string, string>()

  async findById(id: string) {
    return this.patients.get(id) ?? null
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

  async getOwnerAccountId(patientId: string) {
    return this.owners.get(patientId) ?? null
  }

  async listOwnerAccountIds(patientIds: readonly string[]) {
    const map = new Map<string, string>()
    for (const id of patientIds) {
      const owner = this.owners.get(id)
      if (owner) map.set(id, owner)
    }
    return map
  }

  async setOwnerAccountId(patientId: string, accountId: string) {
    this.owners.set(patientId, accountId)
  }

  async findAllByHousehold() {
    return [...this.patients.values()]
  }

  async delete(id: string) {
    this.patients.delete(id)
    this.owners.delete(id)
  }
}

function makePatient(id: string): Patient {
  const data: PatientData = {
    id,
    name: 'Pedro',
    birthDate: new Date('2018-01-01'),
    gender: 'male',
    bloodType: null,
    weightKg: null,
    heightCm: null,
    photoUrl: null,
    parentIds: [],
    cpf: null,
    cns: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  return Patient.restore(data)
}

describe('PatientService.delete owner check', () => {
  const patientId = '11111111-1111-1111-1111-111111111111'
  const ownerId = '22222222-2222-2222-2222-222222222222'
  const caregiverId = '33333333-3333-3333-3333-333333333333'

  function setup() {
    const repo = new InMemoryPatientRepo()
    repo.patients.set(patientId, makePatient(patientId))
    repo.owners.set(patientId, ownerId)
    return { repo, service: new PatientService(repo) }
  }

  it('titular pode excluir o perfil', async () => {
    const { service, repo } = setup()
    await service.delete(patientId, ownerId)
    expect(repo.patients.has(patientId)).toBe(false)
  })

  it('cuidador convidado não pode excluir o perfil', async () => {
    const { service, repo } = setup()
    await expect(service.delete(patientId, caregiverId)).rejects.toThrow('PATIENT_DELETE_FORBIDDEN')
    expect(repo.patients.has(patientId)).toBe(true)
  })

  it('sem owner_account_id ninguem autenticado exclui', async () => {
    const { service, repo } = setup()
    repo.owners.delete(patientId)
    await expect(service.delete(patientId, ownerId)).rejects.toThrow('PATIENT_DELETE_FORBIDDEN')
    expect(repo.patients.has(patientId)).toBe(true)
  })

  it('sem actor (auth desligado) ainda exclui — compat local', async () => {
    const { service, repo } = setup()
    await service.delete(patientId)
    expect(repo.patients.has(patientId)).toBe(false)
  })

  it('perfil inexistente continua 404', async () => {
    const { service } = setup()
    await expect(service.delete('99999999-9999-9999-9999-999999999999', ownerId)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})
