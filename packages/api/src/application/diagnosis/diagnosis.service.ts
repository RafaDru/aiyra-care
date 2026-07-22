import { Diagnosis, type DiagnosisProps } from '../../domain/diagnosis/diagnosis.entity.js'
import type { DiagnosisRepository, DiagnosisFilter } from '../../domain/diagnosis/diagnosis.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class DiagnosisService {
  constructor(private readonly repo: DiagnosisRepository) {}

  async create(data: DiagnosisProps) {
    const diagnosis = Diagnosis.create(data)
    return this.repo.save(diagnosis)
  }

  async findById(id: string) {
    const diagnosis = await this.repo.findById(id)
    if (!diagnosis) throw new NotFoundError('Diagnosis', id)
    return diagnosis
  }

  async findAll(filter?: DiagnosisFilter) { return this.repo.findAll(filter) }

  async update(id: string, data: Partial<DiagnosisProps>) {
    const existing = await this.findById(id)
    const updated = Diagnosis.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
