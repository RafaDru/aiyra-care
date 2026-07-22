import type { Pool } from 'pg'
import type { MedicationRepository, MedicationFilter } from '../../domain/medication/medication.repository.js'
import { Medication } from '../../domain/medication/medication.entity.js'
import type { MedicationData } from '../../domain/medication/medication.entity.js'

const COLUMNS = 'id, patient_id, medical_record_id, generic_name, brand_name, dosage, frequency, route, start_date, end_date, prescribing_doctor, notes, is_active, created_at'

function rowToEntity(row: Record<string, unknown>): Medication {
  return Medication.restore({
    id: row.id as string, patientId: row.patient_id as string, medicalRecordId: row.medical_record_id as string | null,
    genericName: row.generic_name as string, brandName: row.brand_name as string | null,
    dosage: row.dosage as string | null, frequency: row.frequency as string | null, route: row.route as string | null,
    startDate: row.start_date as Date | null, endDate: row.end_date as Date | null,
    prescribingDoctor: row.prescribing_doctor as string | null, notes: row.notes as string | null,
    isActive: row.is_active as boolean, createdAt: row.created_at as Date,
  })
}

export class MedicationPgRepository implements MedicationRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM medications WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: MedicationFilter) {
    const conditions: string[] = []; const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + (params.push(filter.patientId)))
    if (filter?.isActive != null) conditions.push('is_active = $' + (params.push(filter.isActive)))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM medications ${where} ORDER BY start_date DESC NULLS LAST`, params)
    return rows.map(rowToEntity)
  }

  async save(med: Medication) {
    const { rows } = await this.pool.query(
      `INSERT INTO medications (id, patient_id, medical_record_id, generic_name, brand_name, dosage, frequency, route, start_date, end_date, prescribing_doctor, notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING ${COLUMNS}`,
      [med.id, med.patientId, med.medicalRecordId, med.genericName, med.brandName, med.dosage, med.frequency, med.route, med.startDate, med.endDate, med.prescribingDoctor, med.notes, med.isActive]
    )
    return rowToEntity(rows[0])
  }

  async update(med: Medication) {
    const { rows } = await this.pool.query(
      `UPDATE medications SET generic_name=$1, brand_name=$2, dosage=$3, frequency=$4, route=$5, start_date=$6, end_date=$7, prescribing_doctor=$8, notes=$9, is_active=$10 WHERE id=$11 RETURNING ${COLUMNS}`,
      [med.genericName, med.brandName, med.dosage, med.frequency, med.route, med.startDate, med.endDate, med.prescribingDoctor, med.notes, med.isActive, med.id]
    )
    if (!rows.length) throw new Error('Medication ' + med.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM medications WHERE id = $1', [id]) }
}
