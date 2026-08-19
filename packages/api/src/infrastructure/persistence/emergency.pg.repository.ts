import type { Pool } from 'pg'
import type {
  EmergencyRepository,
  EmergencyDirectoryFilter,
  PatientEmergencyContactFilter,
} from '../../domain/emergency/emergency.repository.js'
import type { EmergencyDirectoryEntry } from '../../domain/emergency/emergency-directory.types.js'
import { PatientEmergencyContact } from '../../domain/emergency/patient-emergency-contact.entity.js'

const DIR_COLS = 'id, category, scope, state_code, city_name, name, phone, phone_alt, description, instructions, source_url, official_org, available_24h, sort_order'

const CONTACT_COLS = 'id, patient_id, name, phone, phone_alt, relationship, notes, sort_order, deleted_at, deleted_by, created_at, updated_at'

function rowToDirectory(row: Record<string, unknown>): EmergencyDirectoryEntry {
  return {
    id: row.id as string,
    category: row.category as EmergencyDirectoryEntry['category'],
    scope: row.scope as EmergencyDirectoryEntry['scope'],
    stateCode: row.state_code as string | null,
    cityName: row.city_name as string | null,
    name: row.name as string,
    phone: row.phone as string,
    phoneAlt: row.phone_alt as string | null,
    description: row.description as string | null,
    instructions: row.instructions as string | null,
    sourceUrl: row.source_url as string | null,
    officialOrg: row.official_org as string | null,
    available24h: Boolean(row.available_24h),
    sortOrder: Number(row.sort_order),
  }
}

function rowToContact(row: Record<string, unknown>): PatientEmergencyContact {
  return PatientEmergencyContact.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    name: row.name as string,
    phone: row.phone as string,
    phoneAlt: row.phone_alt as string | null,
    relationship: row.relationship as string | null,
    notes: row.notes as string | null,
    sortOrder: Number(row.sort_order),
    deletedAt: row.deleted_at as Date | null,
    deletedBy: row.deleted_by as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class EmergencyPgRepository implements EmergencyRepository {
  constructor(private readonly pool: Pool) {}

  async listDirectory(filter?: EmergencyDirectoryFilter) {
    const conditions = ['active = true']
    const params: unknown[] = []
    if (filter?.category) conditions.push(`category = $${params.push(filter.category)}`)
    if (filter?.scope) conditions.push(`scope = $${params.push(filter.scope)}`)
    if (filter?.stateCode) {
      conditions.push(`(scope = 'national' OR state_code = $${params.push(filter.stateCode)})`)
    }
    const where = `WHERE ${conditions.join(' AND ')}`
    const { rows } = await this.pool.query(
      `SELECT ${DIR_COLS} FROM emergency_directory ${where} ORDER BY sort_order, name`,
      params,
    )
    return rows.map(rowToDirectory)
  }

  async findContactById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT ${CONTACT_COLS} FROM patient_emergency_contacts WHERE id = $1`,
      [id],
    )
    return rows.length ? rowToContact(rows[0]) : null
  }

  async listContacts(filter?: PatientEmergencyContactFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.patientId) conditions.push(`patient_id = $${params.push(filter.patientId)}`)
    if (!filter?.includeDeleted) conditions.push('deleted_at IS NULL')
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await this.pool.query(
      `SELECT ${CONTACT_COLS} FROM patient_emergency_contacts ${where} ORDER BY sort_order, name`,
      params,
    )
    return rows.map(rowToContact)
  }

  async saveContact(contact: PatientEmergencyContact) {
    const d = contact.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO patient_emergency_contacts
       (id, patient_id, name, phone, phone_alt, relationship, notes, sort_order, deleted_at, deleted_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${CONTACT_COLS}`,
      [
        d.id, d.patientId, d.name, d.phone, d.phoneAlt, d.relationship, d.notes, d.sortOrder,
        d.deletedAt, d.deletedBy, d.createdAt, d.updatedAt,
      ],
    )
    return rowToContact(rows[0])
  }

  async updateContact(contact: PatientEmergencyContact) {
    const d = contact.toJSON()
    const { rows } = await this.pool.query(
      `UPDATE patient_emergency_contacts
       SET name=$1, phone=$2, phone_alt=$3, relationship=$4, notes=$5, sort_order=$6,
           deleted_at=$7, deleted_by=$8, updated_at=$9
       WHERE id=$10 RETURNING ${CONTACT_COLS}`,
      [
        d.name, d.phone, d.phoneAlt, d.relationship, d.notes, d.sortOrder,
        d.deletedAt, d.deletedBy, d.updatedAt, d.id,
      ],
    )
    if (!rows.length) throw new Error('PatientEmergencyContact ' + d.id + ' not found')
    return rowToContact(rows[0])
  }
}
