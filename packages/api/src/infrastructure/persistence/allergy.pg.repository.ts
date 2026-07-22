import type { Pool } from 'pg'
import type { AllergyRepository, AllergyFilter } from '../../domain/allergy/allergy.repository.js'
import { Allergy } from '../../domain/allergy/allergy.entity.js'
import type { AllergyData } from '../../domain/allergy/allergy.entity.js'

const COLUMNS = 'id, patient_id, allergen, reaction, severity, diagnosed_date, notes, created_at'

function rowToEntity(row: Record<string, unknown>): Allergy {
  return Allergy.restore({
    id: row.id as string, patientId: row.patient_id as string, allergen: row.allergen as string,
    reaction: row.reaction as string | null, severity: row.severity as string | null,
    diagnosedDate: row.diagnosed_date as Date | null, notes: row.notes as string | null,
    createdAt: row.created_at as Date,
  })
}

export class AllergyPgRepository implements AllergyRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM allergies WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: AllergyFilter) {
    const conditions: string[] = []; const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + (params.push(filter.patientId)))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM allergies ${where} ORDER BY created_at DESC`, params)
    return rows.map(rowToEntity)
  }

  async save(allergy: Allergy) {
    const { rows } = await this.pool.query(
      `INSERT INTO allergies (id, patient_id, allergen, reaction, severity, diagnosed_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLUMNS}`,
      [allergy.id, allergy.patientId, allergy.allergen, allergy.reaction, allergy.severity, allergy.diagnosedDate, allergy.notes]
    )
    return rowToEntity(rows[0])
  }

  async update(allergy: Allergy) {
    const { rows } = await this.pool.query(
      `UPDATE allergies SET allergen=$1, reaction=$2, severity=$3, diagnosed_date=$4, notes=$5 WHERE id=$6 RETURNING ${COLUMNS}`,
      [allergy.allergen, allergy.reaction, allergy.severity, allergy.diagnosedDate, allergy.notes, allergy.id]
    )
    if (!rows.length) throw new Error('Allergy ' + allergy.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM allergies WHERE id = $1', [id]) }
}
