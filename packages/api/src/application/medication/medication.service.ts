import { Medication, type MedicationProps } from '../../domain/medication/medication.entity.js'
import type { MedicationRepository, MedicationFilter } from '../../domain/medication/medication.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class MedicationService {
  constructor(private readonly repo: MedicationRepository) {}

  async create(data: MedicationProps) {
    const medication = Medication.create(data)
    return this.repo.save(medication)
  }

  async findById(id: string) {
    const medication = await this.repo.findById(id)
    if (!medication) throw new NotFoundError('Medication', id)
    return medication
  }

  async findAll(filter?: MedicationFilter) { return this.repo.findAll(filter) }

  async update(id: string, data: Partial<MedicationProps>) {
    const existing = await this.findById(id)
    const updated = Medication.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
