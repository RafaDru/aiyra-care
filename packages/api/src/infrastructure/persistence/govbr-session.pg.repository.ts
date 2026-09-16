import type { Pool } from 'pg'
import { encrypt, decrypt } from '../crypto-helper.js'
import type { GovBrTokenSnapshot } from '../govbr/govbr-token-session.js'

export interface GovBrSessionRow {
  accountId: string
  encryptedAccessToken: string
  encryptedRefreshToken: string | null
  tokenExpiresAt: Date
  conectesusLastFetchAt: Date | null
}

const SESSION_SKEW_MS = 60_000

export class GovBrSessionPgRepository {
  constructor(private readonly pool: Pool) {}

  async findByAccountId(accountId: string): Promise<GovBrSessionRow | null> {
    const { rows } = await this.pool.query(
      `SELECT account_id, encrypted_access_token, encrypted_refresh_token,
              token_expires_at, conectesus_last_fetch_at
       FROM govbr_sessions WHERE account_id = $1`,
      [accountId],
    )
    if (!rows.length) return null
    const row = rows[0]
    return {
      accountId: row.account_id as string,
      encryptedAccessToken: row.encrypted_access_token as string,
      encryptedRefreshToken: row.encrypted_refresh_token as string | null,
      tokenExpiresAt: row.token_expires_at as Date,
      conectesusLastFetchAt: row.conectesus_last_fetch_at as Date | null,
    }
  }

  async upsert(accountId: string, snapshot: GovBrTokenSnapshot): Promise<void> {
    await this.pool.query(
      `INSERT INTO govbr_sessions (
        account_id, encrypted_access_token, encrypted_refresh_token, token_expires_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (account_id) DO UPDATE SET
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = NOW()`,
      [
        accountId,
        encrypt(snapshot.accessToken),
        snapshot.refreshToken ? encrypt(snapshot.refreshToken) : null,
        new Date(snapshot.expiresAtMs),
      ],
    )
  }

  async touchConecteSUSFetch(accountId: string): Promise<void> {
    await this.pool.query(
      `UPDATE govbr_sessions SET conectesus_last_fetch_at = NOW(), updated_at = NOW()
       WHERE account_id = $1`,
      [accountId],
    )
  }

  async deleteByAccountId(accountId: string): Promise<void> {
    await this.pool.query('DELETE FROM govbr_sessions WHERE account_id = $1', [accountId])
  }

  snapshotFromRow(row: GovBrSessionRow): GovBrTokenSnapshot | null {
    if (!row.encryptedAccessToken) return null
    try {
      return {
        accessToken: decrypt(row.encryptedAccessToken),
        expiresAtMs: row.tokenExpiresAt.getTime(),
        refreshToken: row.encryptedRefreshToken ? decrypt(row.encryptedRefreshToken) : undefined,
      }
    } catch {
      return null
    }
  }

  isRowValid(row: GovBrSessionRow): boolean {
    return row.tokenExpiresAt.getTime() > Date.now() + SESSION_SKEW_MS
  }
}
