import type { Patient } from './patient.entity.js'

export interface PatientRepository {
  findById(id: string): Promise<Patient | null>
  findAll(): Promise<Patient[]>
  findByIds(ids: readonly string[]): Promise<Patient[]>
  save(patient: Patient): Promise<Patient>
  update(patient: Patient): Promise<Patient>
  setOwnerAccountId(patientId: string, accountId: string): Promise<void>
  delete(id: string): Promise<void>
}
