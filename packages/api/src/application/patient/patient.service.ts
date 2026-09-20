import { Patient, type PatientProps } from '../../domain/patient/patient.entity.js'
import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class PatientService {
  constructor(private readonly repo: PatientRepository) {}

  async create(data: PatientProps): Promise<Patient> {
    const patient = Patient.create(data)
    return this.repo.save(patient)
  }

  async findById(id: string): Promise<Patient> {
    const patient = await this.repo.findById(id)
    if (!patient) throw new NotFoundError('Patient', id)
    return patient
  }

  async findAll(): Promise<Patient[]> {
    return this.repo.findAll()
  }

  async findByIds(ids: readonly string[]): Promise<Patient[]> {
    return this.repo.findByIds(ids)
  }

  async update(id: string, data: Partial<PatientProps>): Promise<Patient> {
    const existing = await this.findById(id)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as Partial<PatientProps>
    const updated = Patient.restore({
      ...existing.toJSON(),
      ...cleanData,
      updatedAt: new Date(),
    })
    return this.repo.update(updated)
  }

  async delete(id: string, actorAccountId?: string): Promise<void> {
    await this.findById(id)
    if (actorAccountId) {
      const ownerId = await this.repo.getOwnerAccountId(id)
      if (!ownerId || ownerId !== actorAccountId) {
        throw new Error('PATIENT_DELETE_FORBIDDEN')
      }
    }
    await this.repo.delete(id)
  }

  getOwnerAccountId(patientId: string): Promise<string | null> {
    return this.repo.getOwnerAccountId(patientId)
  }

  listOwnerAccountIds(patientIds: readonly string[]): Promise<Map<string, string>> {
    return this.repo.listOwnerAccountIds(patientIds)
  }

  async setOwnerAccountId(patientId: string, accountId: string): Promise<void> {
    await this.findById(patientId)
    await this.repo.setOwnerAccountId(patientId, accountId)
  }
}
