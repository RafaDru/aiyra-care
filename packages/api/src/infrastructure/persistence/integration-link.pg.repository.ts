import type { Pool } from 'pg'
import type { IntegrationLinkRepository } from '../../domain/integration-link/integration-link.repository.js'
import { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'
import type { IntegrationLinkData } from '../../domain/integration-link/integration-link.entity.js'

const COLUMNS = 'id, patient_id, portal_type, email, encrypted_password, encrypted_session_token, session_expires_at, card_number, active, last_sync_at, auth_attention, created_at, updated_at'

function rowToEntity(row: Record<string, unknown>): IntegrationLink {
  return IntegrationLink.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    portalType: row.portal_type as string,
    email: row.email as string | null,
    encryptedPassword: row.encrypted_password as string | null,
    encryptedSessionToken: row.encrypted_session_token as string | null,
    sessionExpiresAt: row.session_expires_at as Date | null,
    cardNumber: row.card_number as string | null,
    active: row.active as boolean,
    lastSyncAt: row.last_sync_at as Date | null,
    authAttention: (row.auth_attention as IntegrationLinkData['authAttention']) ?? 'none',
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

  async findSyncableActive() {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM integration_links
       WHERE active = true
         AND portal_type IN ('unimed', 'amil', 'mater_dei', 'hermes_pardini')
         AND email IS NOT NULL AND encrypted_password IS NOT NULL
       ORDER BY last_sync_at NULLS FIRST, portal_type`,
    )
    return rows.map(rowToEntity)
  }

  async save(link: IntegrationLink) {
    const { rows } = await this.pool.query(
      `INSERT INTO integration_links (id, patient_id, portal_type, email, encrypted_password, encrypted_session_token, session_expires_at, card_number, active, last_sync_at, auth_attention)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING ${COLUMNS}`,
      [link.id, link.patientId, link.portalType, link.email, link.encryptedPassword, link.encryptedSessionToken, link.sessionExpiresAt, link.cardNumber, link.active, link.lastSyncAt, link.authAttention],
    )
    return rowToEntity(rows[0])
  }

  async update(link: IntegrationLink) {
    const { rows } = await this.pool.query(
      `UPDATE integration_links SET email=$1, encrypted_password=$2, encrypted_session_token=$3, session_expires_at=$4, card_number=$5, active=$6, last_sync_at=$7, auth_attention=$8, updated_at=NOW()
       WHERE id=$9 RETURNING ${COLUMNS}`,
      [link.email, link.encryptedPassword, link.encryptedSessionToken, link.sessionExpiresAt, link.cardNumber, link.active, link.lastSyncAt, link.authAttention, link.id],
    )
    if (!rows.length) throw new Error('IntegrationLink ' + link.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM integration_links WHERE id = $1', [id]) }
}
