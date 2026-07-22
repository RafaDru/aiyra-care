import type { Pool } from 'pg'
import type { MedicalRecordRepository, MedicalRecordFilter } from '../../domain/medical-record/medical-record.repository.js'
import { MedicalRecord } from '../../domain/medical-record/medical-record.entity.js'
import type { MedicalRecordData } from '../../domain/medical-record/medical-record.entity.js'

const COLUMNS = 'id, patient_id, record_date, record_type, description, doctor_name, doctor_crm, specialty, clinic_name, notes, created_at'

function rowToEntity(row: Record<string, unknown>): MedicalRecord {
  return MedicalRecord.restore({
    id: row.id as string, patientId: row.patient_id as string,
    recordDate: row.record_date as Date, recordType: row.record_type as string,
    description: row.description as string | null, doctorName: row.doctor_name as string | null,
    doctorCrm: row.doctor_crm as string | null, specialty: row.specialty as string | null,
    clinicName: row.clinic_name as string | null, notes: row.notes as string | null,
    createdAt: row.created_at as Date,
  })
}

export class MedicalRecordPgRepository implements MedicalRecordRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM medical_records WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: MedicalRecordFilter) {
    const conditions: string[] = []; const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + (params.push(filter.patientId)))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM medical_records ${where} ORDER BY record_date DESC`, params)
    return rows.map(rowToEntity)
  }

  async save(record: MedicalRecord) {
    const { rows } = await this.pool.query(
      `INSERT INTO medical_records (id, patient_id, record_date, record_type, description, doctor_name, doctor_crm, specialty, clinic_name, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${COLUMNS}`,
      [record.id, record.patientId, record.recordDate, record.recordType, record.description, record.doctorName, record.doctorCrm, record.specialty, record.clinicName, record.notes]
    )
    return rowToEntity(rows[0])
  }

  async update(record: MedicalRecord) {
    const { rows } = await this.pool.query(
      `UPDATE medical_records SET record_date=$1, record_type=$2, description=$3, doctor_name=$4, doctor_crm=$5, specialty=$6, clinic_name=$7, notes=$8 WHERE id=$9 RETURNING ${COLUMNS}`,
      [record.recordDate, record.recordType, record.description, record.doctorName, record.doctorCrm, record.specialty, record.clinicName, record.notes, record.id]
    )
    if (!rows.length) throw new Error('MedicalRecord ' + record.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM medical_records WHERE id = $1', [id]) }
}
