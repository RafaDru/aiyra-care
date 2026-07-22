import type { MedicalRecord } from './medical-record.entity.js'

export type MedicalRecordFilter = { patientId?: string }

export interface MedicalRecordRepository {
  findById(id: string): Promise<MedicalRecord | null>
  findAll(filter?: MedicalRecordFilter): Promise<MedicalRecord[]>
  save(record: MedicalRecord): Promise<MedicalRecord>
  update(record: MedicalRecord): Promise<MedicalRecord>
  delete(id: string): Promise<void>
}
