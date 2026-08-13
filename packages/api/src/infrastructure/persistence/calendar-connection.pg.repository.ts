import type { Pool } from 'pg'
import { CalendarConnection } from '../../domain/calendar-connection/calendar-connection.entity.js'
import type { CalendarConnectionRepository } from '../../domain/calendar-connection/calendar-connection.repository.js'

const COLUMNS =
  'id, account_id, patient_id, provider, calendar_id, calendar_label, encrypted_access_token, encrypted_refresh_token, token_expires_at, last_sync_at, active, created_at, updated_at'

function rowToEntity(row: Record<string, unknown>): CalendarConnection {
  return CalendarConnection.restore({
    id: row.id as string,
    accountId: row.account_id as string,
    patientId: row.patient_id as string,
    provider: row.provider as 'google' | 'microsoft',
    calendarId: row.calendar_id as string,
    calendarLabel: (row.calendar_label as string | null) ?? null,
    encryptedAccessToken: row.encrypted_access_token as string,
    encryptedRefreshToken: (row.encrypted_refresh_token as string | null) ?? null,
    tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at as string | Date) : null,
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at as string | Date) : null,
    active: Boolean(row.active),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class CalendarConnectionPgRepository implements CalendarConnectionRepository {
  constructor(private readonly pool: Pool) {}

  async findByAccountPatient(accountId: string, patientId: string, provider = 'google') {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM calendar_connections
       WHERE account_id = $1 AND patient_id = $2 AND provider = $3 AND active = true`,
      [accountId, patientId, provider],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async upsert(connection: CalendarConnection) {
    const { rows } = await this.pool.query(
      `INSERT INTO calendar_connections (
         id, account_id, patient_id, provider, calendar_id, calendar_label,
         encrypted_access_token, encrypted_refresh_token, token_expires_at, last_sync_at, active
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (account_id, patient_id, provider) DO UPDATE SET
         calendar_id = EXCLUDED.calendar_id,
         calendar_label = EXCLUDED.calendar_label,
         encrypted_access_token = EXCLUDED.encrypted_access_token,
         encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING ${COLUMNS}`,
      [
        connection.id,
        connection.accountId,
        connection.patientId,
        connection.provider,
        connection.calendarId,
        connection.calendarLabel,
        connection.encryptedAccessToken,
        connection.encryptedRefreshToken,
        connection.tokenExpiresAt,
        connection.lastSyncAt,
        connection.active,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(connection: CalendarConnection) {
    const { rows } = await this.pool.query(
      `UPDATE calendar_connections SET
         calendar_id = $1,
         calendar_label = $2,
         encrypted_access_token = $3,
         encrypted_refresh_token = $4,
         token_expires_at = $5,
         last_sync_at = $6,
         active = $7,
         updated_at = NOW()
       WHERE id = $8
       RETURNING ${COLUMNS}`,
      [
        connection.calendarId,
        connection.calendarLabel,
        connection.encryptedAccessToken,
        connection.encryptedRefreshToken,
        connection.tokenExpiresAt,
        connection.lastSyncAt,
        connection.active,
        connection.id,
      ],
    )
    if (!rows.length) throw new Error(`CalendarConnection ${connection.id} not found`)
    return rowToEntity(rows[0])
  }

  async deleteByAccountPatient(accountId: string, patientId: string, provider = 'google') {
    await this.pool.query(
      `DELETE FROM calendar_connections WHERE account_id = $1 AND patient_id = $2 AND provider = $3`,
      [accountId, patientId, provider],
    )
  }
}
