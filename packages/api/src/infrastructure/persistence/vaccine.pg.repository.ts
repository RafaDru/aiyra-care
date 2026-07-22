import type { Pool } from 'pg'
import type { VaccineRepository, VaccineFilter } from '../../domain/vaccine/vaccine.repository.js'
import { Vaccine } from '../../domain/vaccine/vaccine.entity.js'
import type { VaccineData } from '../../domain/vaccine/vaccine.entity.js'

const COLUMNS = 'id, patient_id, vaccine_name, dose_number, batch_number, application_date, next_dose_date, applied_by, clinic, notes, created_at'

function rowToEntity(row: Record<string, unknown>): Vaccine {
  return Vaccine.restore({
    id: row.id as string, patientId: row.patient_id as string, vaccineName: row.vaccine_name as string,
    doseNumber: row.dose_number != null ? Number(row.dose_number) : null, batchNumber: row.batch_number as string | null,
    applicationDate: row.application_date as Date, nextDoseDate: row.next_dose_date as Date | null,
    appliedBy: row.applied_by as string | null, clinic: row.clinic as string | null, notes: row.notes as string | null,
    createdAt: row.created_at as Date,
  })
}

export class VaccinePgRepository implements VaccineRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM vaccines WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: VaccineFilter) {
    const conditions: string[] = []; const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + (params.push(filter.patientId)))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM vaccines ${where} ORDER BY application_date DESC`, params)
    return rows.map(rowToEntity)
  }

  async save(vaccine: Vaccine) {
    const { rows } = await this.pool.query(
      `INSERT INTO vaccines (id, patient_id, vaccine_name, dose_number, batch_number, application_date, next_dose_date, applied_by, clinic, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${COLUMNS}`,
      [vaccine.id, vaccine.patientId, vaccine.vaccineName, vaccine.doseNumber, vaccine.batchNumber, vaccine.applicationDate, vaccine.nextDoseDate, vaccine.appliedBy, vaccine.clinic, vaccine.notes]
    )
    return rowToEntity(rows[0])
  }

  async update(vaccine: Vaccine) {
    const { rows } = await this.pool.query(
      `UPDATE vaccines SET vaccine_name=$1, dose_number=$2, batch_number=$3, application_date=$4, next_dose_date=$5, applied_by=$6, clinic=$7, notes=$8 WHERE id=$9 RETURNING ${COLUMNS}`,
      [vaccine.vaccineName, vaccine.doseNumber, vaccine.batchNumber, vaccine.applicationDate, vaccine.nextDoseDate, vaccine.appliedBy, vaccine.clinic, vaccine.notes, vaccine.id]
    )
    if (!rows.length) throw new Error('Vaccine ' + vaccine.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM vaccines WHERE id = $1', [id]) }
}
