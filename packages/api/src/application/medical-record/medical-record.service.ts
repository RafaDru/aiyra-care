import { MedicalRecord, type MedicalRecordProps } from '../../domain/medical-record/medical-record.entity.js'
import type { MedicalRecordRepository, MedicalRecordFilter } from '../../domain/medical-record/medical-record.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class MedicalRecordService {
  constructor(private readonly repo: MedicalRecordRepository) {}

  async create(data: MedicalRecordProps) {
    const record = MedicalRecord.create(data)
    return this.repo.save(record)
  }

  async findById(id: string) {
    const record = await this.repo.findById(id)
    if (!record) throw new NotFoundError('MedicalRecord', id)
    return record
  }

  async findAll(filter?: MedicalRecordFilter) { return this.repo.findAll(filter) }

  async update(id: string, data: Partial<MedicalRecordProps>) {
    const existing = await this.findById(id)
    const updated = MedicalRecord.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
