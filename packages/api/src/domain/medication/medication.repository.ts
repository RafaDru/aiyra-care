import type { Medication } from './medication.entity.js'

export type MedicationFilter = { patientId?: string; isActive?: boolean }

export interface MedicationRepository {
  findById(id: string): Promise<Medication | null>
  findAll(filter?: MedicationFilter): Promise<Medication[]>
  save(medication: Medication): Promise<Medication>
  update(medication: Medication): Promise<Medication>
  delete(id: string): Promise<void>
}
