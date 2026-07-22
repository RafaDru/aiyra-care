import type { Pool } from 'pg'
import type { DiagnosisRepository, DiagnosisFilter } from '../../domain/diagnosis/diagnosis.repository.js'
import { Diagnosis } from '../../domain/diagnosis/diagnosis.entity.js'
import type { DiagnosisData } from '../../domain/diagnosis/diagnosis.entity.js'

const COLUMNS = 'id, medical_record_id, patient_id, diagnosis_code, diagnosis_name, description, is_chronic, diagnosed_date, status, created_at'

function rowToEntity(row: Record<string, unknown>): Diagnosis {
  return Diagnosis.restore({
    id: row.id as string, medicalRecordId: row.medical_record_id as string | null, patientId: row.patient_id as string,
    diagnosisCode: row.diagnosis_code as string | null, diagnosisName: row.diagnosis_name as string,
    description: row.description as string | null, isChronic: row.is_chronic as boolean,
    diagnosedDate: row.diagnosed_date as Date | null, status: row.status as string | null,
    createdAt: row.created_at as Date,
  })
}

export class DiagnosisPgRepository implements DiagnosisRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM diagnoses WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: DiagnosisFilter) {
    const conditions: string[] = []; const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + (params.push(filter.patientId)))
    if (filter?.medicalRecordId) conditions.push('medical_record_id = $' + (params.push(filter.medicalRecordId)))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM diagnoses ${where} ORDER BY created_at DESC`, params)
    return rows.map(rowToEntity)
  }

  async save(diag: Diagnosis) {
    const { rows } = await this.pool.query(
      `INSERT INTO diagnoses (id, medical_record_id, patient_id, diagnosis_code, diagnosis_name, description, is_chronic, diagnosed_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${COLUMNS}`,
      [diag.id, diag.medicalRecordId, diag.patientId, diag.diagnosisCode, diag.diagnosisName, diag.description, diag.isChronic, diag.diagnosedDate, diag.status]
    )
    return rowToEntity(rows[0])
  }

  async update(diag: Diagnosis) {
    const { rows } = await this.pool.query(
      `UPDATE diagnoses SET diagnosis_code=$1, diagnosis_name=$2, description=$3, is_chronic=$4, diagnosed_date=$5, status=$6 WHERE id=$7 RETURNING ${COLUMNS}`,
      [diag.diagnosisCode, diag.diagnosisName, diag.description, diag.isChronic, diag.diagnosedDate, diag.status, diag.id]
    )
    if (!rows.length) throw new Error('Diagnosis ' + diag.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM diagnoses WHERE id = $1', [id]) }
}
