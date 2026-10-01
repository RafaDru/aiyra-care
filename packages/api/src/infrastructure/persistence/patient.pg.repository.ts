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

  async getOwnerAccountId(patientId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT owner_account_id::text AS owner_account_id FROM patients WHERE id = $1`,
      [patientId],
    )
    return rows[0]?.owner_account_id ?? null
  }

  async listOwnerAccountIds(patientIds: readonly string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (patientIds.length === 0) return map
    const { rows } = await this.pool.query(
      `SELECT id::text AS id, owner_account_id::text AS owner_account_id
       FROM patients WHERE id = ANY($1::uuid[]) AND owner_account_id IS NOT NULL`,
      [patientIds],
    )
    for (const row of rows) {
      map.set(String(row.id), String(row.owner_account_id))
    }
    return map
  }

  async setOwnerAccountId(patientId: string, accountId: string): Promise<void> {
    await this.pool.query(
      `UPDATE patients SET owner_account_id = $2, updated_at = NOW() WHERE id = $1`,
      [patientId, accountId],
    )
  }

  async findAllByHousehold(patientId: string): Promise<Patient[]> {
    const { rows: patientRows } = await this.pool.query(`SELECT owner_account_id, parent_ids FROM patients WHERE id = $1`, [patientId])
    if (patientRows.length === 0) return []

    const ownerAccountId = patientRows[0].owner_account_id
    const parentIds = patientRows[0].parent_ids || []

    let allHouseholdIds = [patientId]

    // Se o paciente atual tem owner_account_id, busca todos os pacientes desse owner
    if (ownerAccountId) {
      const { rows: ownerPatients } = await this.pool.query(
        `SELECT id FROM patients WHERE owner_account_id = $1`,
        [ownerAccountId],
      )
      allHouseholdIds.push(...ownerPatients.map((r) => r.id))
    }

    // Adiciona os pais diretos
    if (parentIds.length > 0) {
      allHouseholdIds.push(...parentIds)
    }

    // Adiciona os filhos de todos os pacientes já encontrados
    const { rows: childrenRows } = await this.pool.query(
      `SELECT id FROM patients WHERE parent_ids && $1::uuid[]`, // && = overlap operator
      [Array.from(new Set(allHouseholdIds))],
    )
    allHouseholdIds.push(...childrenRows.map((r) => r.id))

    // Filtra IDs únicos e busca todos os pacientes
    const uniqueIds = Array.from(new Set(allHouseholdIds))
    return this.findByIds(uniqueIds)
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM patients WHERE id = $1', [id])
  }
}
