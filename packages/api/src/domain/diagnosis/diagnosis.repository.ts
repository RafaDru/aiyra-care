import type { Diagnosis } from './diagnosis.entity.js'

export type DiagnosisFilter = { patientId?: string; medicalRecordId?: string }

export interface DiagnosisRepository {
  findById(id: string): Promise<Diagnosis | null>
  findAll(filter?: DiagnosisFilter): Promise<Diagnosis[]>
  save(diagnosis: Diagnosis): Promise<Diagnosis>
  update(diagnosis: Diagnosis): Promise<Diagnosis>
  delete(id: string): Promise<void>
}
