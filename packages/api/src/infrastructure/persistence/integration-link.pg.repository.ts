import type { Pool } from 'pg'
import type { IntegrationLinkRepository } from '../../domain/integration-link/integration-link.repository.js'
import { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'
import type { IntegrationLinkData } from '../../domain/integration-link/integration-link.entity.js'

const COLUMNS = 'id, patient_id, portal_type, email, encrypted_password, card_number, active, last_sync_at, created_at, updated_at'

function rowToEntity(row: Record<string, unknown>): IntegrationLink {
  return IntegrationLink.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    portalType: row.portal_type as string,
    email: row.email as string | null,
    encryptedPassword: row.encrypted_password as string | null,
    cardNumber: row.card_number as string | null,
    active: row.active as boolean,
    lastSyncAt: row.last_sync_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class IntegrationLinkPgRepository implements IntegrationLinkRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM integration_links WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findByPatientAndPortal(patientId: string, portalType: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM integration_links WHERE patient_id = $1 AND portal_type = $2`,
      [patientId, portalType],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAllByPatient(patientId: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM integration_links WHERE patient_id = $1 ORDER BY portal_type`,
      [patientId],
    )
    return rows.map(rowToEntity)
  }

  async save(link: IntegrationLink) {
    const { rows } = await this.pool.query(
      `INSERT INTO integration_links (id, patient_id, portal_type, email, encrypted_password, card_number, active, last_sync_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLUMNS}`,
      [link.id, link.patientId, link.portalType, link.email, link.encryptedPassword, link.cardNumber, link.active, link.lastSyncAt],
    )
    return rowToEntity(rows[0])
  }

  async update(link: IntegrationLink) {
    const { rows } = await this.pool.query(
      `UPDATE integration_links SET email=$1, encrypted_password=$2, card_number=$3, active=$4, last_sync_at=$5, updated_at=NOW()
       WHERE id=$6 RETURNING ${COLUMNS}`,
      [link.email, link.encryptedPassword, link.cardNumber, link.active, link.lastSyncAt, link.id],
    )
    if (!rows.length) throw new Error('IntegrationLink ' + link.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM integration_links WHERE id = $1', [id]) }
}
