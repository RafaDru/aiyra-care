import { GrowthRecord, type GrowthRecordProps } from '../../domain/growth-record/growth-record.entity.js'
import type { GrowthRecordRepository, GrowthRecordFilter } from '../../domain/growth-record/growth-record.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class GrowthRecordService {
  constructor(private readonly repo: GrowthRecordRepository) {}

  private calcBmi(weightKg?: number | null, heightCm?: number | null): number | null {
    if (!weightKg || !heightCm) return null
    return Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10
  }

  async create(data: GrowthRecordProps) {
    const record = GrowthRecord.create({
      ...data,
      bmi: data.bmi ?? this.calcBmi(data.weightKg, data.heightCm) ?? undefined,
    })
    return this.repo.save(record)
  }

  async findById(id: string) {
    const record = await this.repo.findById(id)
    if (!record) throw new NotFoundError('GrowthRecord', id)
    return record
  }

  async findAll(filter?: GrowthRecordFilter) {
    return this.repo.findAll(filter)
  }

  async update(id: string, data: Partial<GrowthRecordProps>) {
    const existing = await this.findById(id)
    const merged = { ...existing.toJSON(), ...data }
    merged.bmi = data.bmi ?? this.calcBmi(merged.weightKg, merged.heightCm) ?? merged.bmi
    const updated = GrowthRecord.restore(merged)
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
