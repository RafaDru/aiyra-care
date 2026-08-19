import { Vaccine, type VaccineProps } from '../../domain/vaccine/vaccine.entity.js'
import type { VaccineRepository, VaccineFilter } from '../../domain/vaccine/vaccine.repository.js'
import { detectVaccineDuplicatePair } from '../../domain/hygiene/vaccine-duplicate-detector.js'
import { isVaccineHygieneDuplicate } from '../../domain/hygiene/vaccine-notes.js'
import type { PatientBirthDateResolver } from '../hygiene/hygiene-detector.service.js'
import { NotFoundError } from '../../domain/errors.js'

const IMPORT_SKIP_SCORE = 88

export class VaccineService {
  constructor(
    private readonly repo: VaccineRepository,
    private readonly birthDates?: PatientBirthDateResolver,
  ) {}

  async create(data: VaccineProps) {
    const existing = await this.repo.findAll({ patientId: data.patientId })
    const birthDate = this.birthDates
      ? await this.birthDates.resolveBirthDateForPatient(data.patientId)
      : null
    const draft = Vaccine.create(data)
    for (const v of existing) {
      if (isVaccineHygieneDuplicate(v)) continue
      const hit = detectVaccineDuplicatePair(draft, v, birthDate)
      if (hit && hit.score >= IMPORT_SKIP_SCORE) return v
    }
    return this.repo.save(draft)
  }

  async findById(id: string) {
    const vaccine = await this.repo.findById(id)
    if (!vaccine) throw new NotFoundError('Vaccine', id)
    return vaccine
  }

  async findAll(filter?: VaccineFilter) {
    const rows = await this.repo.findAll(filter)
    return rows.filter((v) => !isVaccineHygieneDuplicate(v))
  }

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
