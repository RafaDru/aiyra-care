import type { Pool } from 'pg'
import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import { Patient } from '../../domain/patient/patient.entity.js'
import type { PatientData } from '../../domain/patient/patient.entity.js'

const COLUMNS = `
  id, name, birth_date, gender, blood_type,
  weight_kg, height_cm, photo_url, parent_ids,
  cpf, cns,
  created_at, updated_at
`

function rowToPatient(row: Record<string, unknown>): Patient {
  return Patient.restore({
    id: row.id as string,
    name: row.name as string,
    birthDate: row.birth_date as Date,
    gender: row.gender as string | null,
    bloodType: row.blood_type as string | null,
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
    heightCm: row.height_cm != null ? Number(row.height_cm) : null,
    photoUrl: row.photo_url as string | null,
    parentIds: (row.parent_ids as string[]) ?? [],
    cpf: row.cpf as string | null,
    cns: row.cns as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class PatientPgRepository implements PatientRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Patient | null> {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM patients WHERE id = $1`,
      [id]
    )
    return rows.length ? rowToPatient(rows[0]) : null
  }

  async findAll(): Promise<Patient[]> {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM patients ORDER BY name`
    )
    return rows.map(rowToPatient)
  }

  async findByIds(ids: readonly string[]): Promise<Patient[]> {
    if (ids.length === 0) return []
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM patients WHERE id = ANY($1::uuid[]) ORDER BY name`,
      [ids],
    )
    return rows.map(rowToPatient)
  }

  async save(patient: Patient): Promise<Patient> {
    const { rows } = await this.pool.query(
      `INSERT INTO patients (id, name, birth_date, gender, blood_type, weight_kg, height_cm, photo_url, parent_ids, cpf, cns)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${COLUMNS}`,
      [
        patient.id, patient.name, patient.birthDate,
        patient.gender, patient.bloodType,
        patient.weightKg, patient.heightCm,
        patient.photoUrl, patient.parentIds,
        patient.cpf, patient.cns,
      ]
    )
    return rowToPatient(rows[0])
  }

  async update(patient: Patient): Promise<Patient> {
    const { rows } = await this.pool.query(
      `UPDATE patients SET
        name = $1, birth_date = $2, gender = $3, blood_type = $4,
        weight_kg = $5, height_cm = $6, photo_url = $7,
        parent_ids = $8, cpf = $9, cns = $10,
        updated_at = NOW()
       WHERE id = $11
       RETURNING ${COLUMNS}`,
      [
        patient.name, patient.birthDate,
        patient.gender, patient.bloodType,
        patient.weightKg, patient.heightCm,
        patient.photoUrl, patient.parentIds,
        patient.cpf, patient.cns,
        patient.id,
      ]
    )
    if (!rows.length) throw new Error(`Patient ${patient.id} not found on update`)
    return rowToPatient(rows[0])
  }

  async setOwnerAccountId(patientId: string, accountId: string): Promise<void> {
    await this.pool.query(
      `UPDATE patients SET owner_account_id = $2, updated_at = NOW() WHERE id = $1`,
      [patientId, accountId],
    )
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM patients WHERE id = $1', [id])
  }
}
