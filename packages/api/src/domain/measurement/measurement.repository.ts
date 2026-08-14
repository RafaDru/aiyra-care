import type { MeasurementType } from './measurement-type.entity.js'
import type { MeasurementObservation } from './measurement-observation.entity.js'
import type { MedicationAdministration } from './medication-administration.entity.js'

export type MeasurementObservationFilter = {
  patientId?: string
  typeCodes?: string[]
  categories?: string[]
  healthThreadId?: string
  from?: Date
  to?: Date
}

export type MedicationAdministrationFilter = {
  patientId?: string
  healthThreadId?: string
  from?: Date
  to?: Date
}

export interface MeasurementRepository {
  listTypes(activeOnly?: boolean): Promise<MeasurementType[]>
  findTypeByCode(code: string): Promise<MeasurementType | null>

  findObservationById(id: string): Promise<MeasurementObservation | null>
  findObservations(filter?: MeasurementObservationFilter): Promise<MeasurementObservation[]>
  saveObservation(obs: MeasurementObservation): Promise<MeasurementObservation>
  deleteObservation(id: string): Promise<void>

  findAdministrationById(id: string): Promise<MedicationAdministration | null>
  findAdministrations(filter?: MedicationAdministrationFilter): Promise<MedicationAdministration[]>
  saveAdministration(row: MedicationAdministration): Promise<MedicationAdministration>
  deleteAdministration(id: string): Promise<void>
}
