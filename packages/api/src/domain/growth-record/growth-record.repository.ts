import type { GrowthRecord } from './growth-record.entity.js'

export type GrowthRecordFilter = { patientId?: string }

export interface GrowthRecordRepository {
  findById(id: string): Promise<GrowthRecord | null>
  findAll(filter?: GrowthRecordFilter): Promise<GrowthRecord[]>
  save(record: GrowthRecord): Promise<GrowthRecord>
  update(record: GrowthRecord): Promise<GrowthRecord>
  delete(id: string): Promise<void>
}
