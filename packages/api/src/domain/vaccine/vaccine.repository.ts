import type { Vaccine } from './vaccine.entity.js'

export type VaccineFilter = { patientId?: string }

export interface VaccineRepository {
  findById(id: string): Promise<Vaccine | null>
  findAll(filter?: VaccineFilter): Promise<Vaccine[]>
  save(vaccine: Vaccine): Promise<Vaccine>
  update(vaccine: Vaccine): Promise<Vaccine>
  delete(id: string): Promise<void>
}
