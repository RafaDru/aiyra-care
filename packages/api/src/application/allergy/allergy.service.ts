import { Allergy, type AllergyProps } from '../../domain/allergy/allergy.entity.js'
import type { AllergyRepository, AllergyFilter } from '../../domain/allergy/allergy.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class AllergyService {
  constructor(private readonly repo: AllergyRepository) {}

  async create(data: AllergyProps) {
    const allergy = Allergy.create(data)
    return this.repo.save(allergy)
  }

  async findById(id: string) {
    const allergy = await this.repo.findById(id)
    if (!allergy) throw new NotFoundError('Allergy', id)
    return allergy
  }

  async findAll(filter?: AllergyFilter) { return this.repo.findAll(filter) }

  async update(id: string, data: Partial<AllergyProps>) {
    const existing = await this.findById(id)
    const updated = Allergy.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
