import type { Patient } from './patient.entity.js'

export interface PatientRepository {
  findById(id: string): Promise<Patient | null>
  findAll(): Promise<Patient[]>
  findByIds(ids: readonly string[]): Promise<Patient[]>
  save(patient: Patient): Promise<Patient>
  update(patient: Patient): Promise<Patient>
  getOwnerAccountId(patientId: string): Promise<string | null>
  listOwnerAccountIds(patientIds: readonly string[]): Promise<Map<string, string>>
  setOwnerAccountId(patientId: string, accountId: string): Promise<void>
  findAllByHousehold(patientId: string): Promise<Patient[]>
  delete(id: string): Promise<void>
}
