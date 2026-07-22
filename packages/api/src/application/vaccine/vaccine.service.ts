import { Vaccine, type VaccineProps } from '../../domain/vaccine/vaccine.entity.js'
import type { VaccineRepository, VaccineFilter } from '../../domain/vaccine/vaccine.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class VaccineService {
  constructor(private readonly repo: VaccineRepository) {}

  async create(data: VaccineProps) {
    const vaccine = Vaccine.create(data)
    return this.repo.save(vaccine)
  }

  async findById(id: string) {
    const vaccine = await this.repo.findById(id)
    if (!vaccine) throw new NotFoundError('Vaccine', id)
    return vaccine
  }

  async findAll(filter?: VaccineFilter) { return this.repo.findAll(filter) }

  async update(id: string, data: Partial<VaccineProps>) {
    const existing = await this.findById(id)
    const updated = Vaccine.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
