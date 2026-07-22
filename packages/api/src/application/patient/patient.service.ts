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

  async update(id: string, data: Partial<PatientProps>): Promise<Patient> {
    const existing = await this.findById(id)
    const updated = Patient.restore({
      ...existing.toJSON(),
      ...data,
      updatedAt: new Date(),
    })
    return this.repo.update(updated)
  }

  async delete(id: string): Promise<void> {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
