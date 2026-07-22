import type { Allergy } from './allergy.entity.js'

export type AllergyFilter = { patientId?: string }

export interface AllergyRepository {
  findById(id: string): Promise<Allergy | null>
  findAll(filter?: AllergyFilter): Promise<Allergy[]>
  save(allergy: Allergy): Promise<Allergy>
  update(allergy: Allergy): Promise<Allergy>
  delete(id: string): Promise<void>
}
