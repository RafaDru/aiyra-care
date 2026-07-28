import type { Pool } from 'pg'
import type { AuthorizationRepository, AuthorizationFilter } from '../../domain/authorization/authorization.repository.js'
import { Authorization } from '../../domain/authorization/authorization.entity.js'
import type { AuthorizationData, AuthorizationHistoryEntry, AuthorizationLocation } from '../../domain/authorization/authorization.entity.js'
import { AuthorizationItemPgRepository } from './authorization-item.pg.repository.js'

const COLUMNS = `id, patient_id, procedure_code, procedure_description, doctor_name, doctor_council, clinic_name,
  authorization_date, validity_date, status, guide_number, quantity, notes, source,
  solicitation_number, guide_password, specialty, solicitation_url, solic_id, solic_id_encrypted,
  authorization_type, classification, local_address, local_phone, locations, history,
  medical_record_id, provider_external_id, created_at, updated_at`

function rowToEntity(row: Record<string, unknown>, items: AuthorizationData['items'] = []): Authorization {
  return Authorization.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    procedureCode: row.procedure_code as string | null,
    procedureDescription: row.procedure_description as string | null,
    doctorName: row.doctor_name as string | null,
    doctorCouncil: row.doctor_council as string | null,
    clinicName: row.clinic_name as string | null,
    authorizationDate: row.authorization_date as Date | null,
    validityDate: row.validity_date as Date | null,
    status: row.status as string,
    guideNumber: row.guide_number as string | null,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    notes: row.notes as string | null,
    source: row.source as string,
    solicitationNumber: (row.solicitation_number as string | null) ?? null,
    guidePassword: (row.guide_password as string | null) ?? null,
    specialty: (row.specialty as string | null) ?? null,
    solicitationUrl: (row.solicitation_url as string | null) ?? null,
    solicId: (row.solic_id as string | null) ?? null,
    solicIdEncrypted: (row.solic_id_encrypted as string | null) ?? null,
    authorizationType: (row.authorization_type as string | null) ?? null,
    classification: (row.classification as string | null) ?? null,
    localAddress: (row.local_address as string | null) ?? null,
    localPhone: (row.local_phone as string | null) ?? null,
    locations: (row.locations as AuthorizationLocation[] | null) ?? null,
    history: (row.history as AuthorizationHistoryEntry[] | null) ?? null,
    items,
    medicalRecordId: (row.medical_record_id as string | null) ?? null,
    providerExternalId: (row.provider_external_id as string | null) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: (row.updated_at as Date) ?? (row.created_at as Date),
  })
}

export class AuthorizationPgRepository implements AuthorizationRepository {
  private readonly itemRepo: AuthorizationItemPgRepository

  constructor(private readonly pool: Pool) {
    this.itemRepo = new AuthorizationItemPgRepository(pool)
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM authorizations WHERE id = $1`, [id])
    if (!rows.length) return null
    const items = await this.itemRepo.findByAuthorizationId(id)
    return rowToEntity(rows[0], AuthorizationItemPgRepository.toData(items))
  }

  async findAll(filter?: AuthorizationFilter) {
    const conditions: string[] = []; const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + (params.push(filter.patientId)))
    if (filter?.status) conditions.push('status = $' + (params.push(filter.status)))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM authorizations ${where} ORDER BY authorization_date DESC NULLS LAST, created_at DESC`,
      params,
    )
    const result: Authorization[] = []
    for (const row of rows) {
      const items = await this.itemRepo.findByAuthorizationId(row.id as string)
      result.push(rowToEntity(row, AuthorizationItemPgRepository.toData(items)))
    }
    return result
  }

  async save(auth: Authorization) {
    const { rows } = await this.pool.query(
      `INSERT INTO authorizations (
         id, patient_id, procedure_code, procedure_description, doctor_name, doctor_council, clinic_name,
         authorization_date, validity_date, status, guide_number, quantity, notes, source,
         solicitation_number, guide_password, specialty, solicitation_url, solic_id, solic_id_encrypted,
         authorization_type, classification, local_address, local_phone, locations, history,
         medical_record_id, provider_external_id
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
       ) RETURNING ${COLUMNS}`,
      [
        auth.id, auth.patientId, auth.procedureCode, auth.procedureDescription, auth.doctorName, auth.doctorCouncil, auth.clinicName,
        auth.authorizationDate, auth.validityDate, auth.status, auth.guideNumber, auth.quantity, auth.notes, auth.source,
        auth.solicitationNumber, auth.guidePassword, auth.specialty, auth.solicitationUrl, auth.solicId, auth.solicIdEncrypted,
        auth.authorizationType, auth.classification, auth.localAddress, auth.localPhone,
        auth.locations ? JSON.stringify(auth.locations) : null,
        auth.history ? JSON.stringify(auth.history) : null,
        auth.medicalRecordId, auth.providerExternalId,
      ],
    )
    return rowToEntity(rows[0], auth.items)
  }

  async update(auth: Authorization) {
    const { rows } = await this.pool.query(
      `UPDATE authorizations SET
         procedure_code=$1, procedure_description=$2, doctor_name=$3, doctor_council=$4, clinic_name=$5,
         authorization_date=$6, validity_date=$7, status=$8, guide_number=$9, quantity=$10, notes=$11,
         solicitation_number=$12, guide_password=$13, specialty=$14, solicitation_url=$15,
         solic_id=$16, solic_id_encrypted=$17, authorization_type=$18, classification=$19,
         local_address=$20, local_phone=$21, locations=$22, history=$23,
         medical_record_id=$24, provider_external_id=$25, updated_at=NOW()
       WHERE id=$26 RETURNING ${COLUMNS}`,
      [
        auth.procedureCode, auth.procedureDescription, auth.doctorName, auth.doctorCouncil, auth.clinicName,
        auth.authorizationDate, auth.validityDate, auth.status, auth.guideNumber, auth.quantity, auth.notes,
        auth.solicitationNumber, auth.guidePassword, auth.specialty, auth.solicitationUrl,
        auth.solicId, auth.solicIdEncrypted, auth.authorizationType, auth.classification,
        auth.localAddress, auth.localPhone,
        auth.locations ? JSON.stringify(auth.locations) : null,
        auth.history ? JSON.stringify(auth.history) : null,
        auth.medicalRecordId, auth.providerExternalId,
        auth.id,
      ],
    )
    if (!rows.length) throw new Error('Authorization ' + auth.id + ' not found')
    return rowToEntity(rows[0], auth.items)
  }

  async delete(id: string) { await this.pool.query('DELETE FROM authorizations WHERE id = $1', [id]) }

  async replaceItems(authorizationId: string, items: import('../../domain/authorization/authorization-item.entity.js').AuthorizationItem[]) {
    return this.itemRepo.replaceForAuthorization(authorizationId, items)
  }
}
