import type { Pool } from 'pg'
import type { GrowthRecordRepository, GrowthRecordFilter } from '../../domain/growth-record/growth-record.repository.js'
import { GrowthRecord } from '../../domain/growth-record/growth-record.entity.js'
import type { GrowthRecordData } from '../../domain/growth-record/growth-record.entity.js'

const COLUMNS = 'id, patient_id, record_date, weight_kg, height_cm, head_circumference_cm, bmi, percentile_weight, percentile_height, notes, created_at'

function rowToEntity(row: Record<string, unknown>): GrowthRecord {
  return GrowthRecord.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    recordDate: row.record_date as Date,
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
    heightCm: row.height_cm != null ? Number(row.height_cm) : null,
    headCircumferenceCm: row.head_circumference_cm != null ? Number(row.head_circumference_cm) : null,
    bmi: row.bmi != null ? Number(row.bmi) : null,
    percentileWeight: row.percentile_weight != null ? Number(row.percentile_weight) : null,
    percentileHeight: row.percentile_height != null ? Number(row.percentile_height) : null,
    notes: row.notes as string | null,
    createdAt: row.created_at as Date,
  })
}

export class GrowthRecordPgRepository implements GrowthRecordRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM growth_records WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: GrowthRecordFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.patientId) { conditions.push('patient_id = $' + (params.push(filter.patientId))) }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM growth_records ${where} ORDER BY record_date DESC`, params)
    return rows.map(rowToEntity)
  }

  async save(record: GrowthRecord) {
    const { rows } = await this.pool.query(
      `INSERT INTO growth_records (id, patient_id, record_date, weight_kg, height_cm, head_circumference_cm, bmi, percentile_weight, percentile_height, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${COLUMNS}`,
      [record.id, record.patientId, record.recordDate, record.weightKg, record.heightCm, record.headCircumferenceCm, record.bmi, record.percentileWeight, record.percentileHeight, record.notes]
    )
    return rowToEntity(rows[0])
  }

  async update(record: GrowthRecord) {
    const { rows } = await this.pool.query(
      `UPDATE growth_records SET record_date=$1, weight_kg=$2, height_cm=$3, head_circumference_cm=$4, bmi=$5, percentile_weight=$6, percentile_height=$7, notes=$8 WHERE id=$9 RETURNING ${COLUMNS}`,
      [record.recordDate, record.weightKg, record.heightCm, record.headCircumferenceCm, record.bmi, record.percentileWeight, record.percentileHeight, record.notes, record.id]
    )
    if (!rows.length) throw new Error('GrowthRecord ' + record.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM growth_records WHERE id = $1', [id]) }
}
