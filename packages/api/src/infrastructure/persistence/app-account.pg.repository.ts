import type { Pool } from 'pg'
import type { AppAccountRepository, PatientMembershipRepository } from '../../domain/auth/app-account.repository.js'
import { AppAccount } from '../../domain/auth/app-account.entity.js'
import type { AppAccountData } from '../../domain/auth/app-account.entity.js'

const COLUMNS = 'id, auth_provider, auth_subject, email, display_name, avatar_url, created_at, updated_at'

function rowToEntity(row: Record<string, unknown>): AppAccount {
  return AppAccount.restore({
    id: row.id as string,
    authProvider: row.auth_provider as string,
    authSubject: row.auth_subject as string,
    email: row.email as string | null,
    displayName: row.display_name as string | null,
    avatarUrl: row.avatar_url as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class AppAccountPgRepository implements AppAccountRepository {
  constructor(private readonly pool: Pool) {}

  async findByAuthSubject(authProvider: string, authSubject: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM app_accounts WHERE auth_provider = $1 AND auth_subject = $2`,
      [authProvider, authSubject],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM app_accounts WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async save(account: AppAccount) {
    const data = account.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO app_accounts (id, auth_provider, auth_subject, email, display_name, avatar_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${COLUMNS}`,
      [data.id, data.authProvider, data.authSubject, data.email, data.displayName, data.avatarUrl],
    )
    return rowToEntity(rows[0])
  }

  async update(account: AppAccount) {
    const data = account.toJSON()
    const { rows } = await this.pool.query(
      `UPDATE app_accounts SET email=$2, display_name=$3, avatar_url=$4, updated_at=NOW()
       WHERE id=$1 RETURNING ${COLUMNS}`,
      [data.id, data.email, data.displayName, data.avatarUrl],
    )
    if (!rows.length) throw new Error(`AppAccount ${data.id} not found`)
    return rowToEntity(rows[0])
  }
}

export class PatientMembershipPgRepository implements PatientMembershipRepository {
  constructor(private readonly pool: Pool) {}

  async hasSelfProfile(accountId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 AS ok
       FROM patient_memberships
       WHERE account_id = $1 AND role = 'self'
       LIMIT 1`,
      [accountId],
    )
    if (rows.length) return true

    const owned = await this.pool.query(
      `SELECT 1 AS ok FROM patients WHERE owner_account_id = $1 LIMIT 1`,
      [accountId],
    )
    return owned.rows.length > 0
  }

  async listAccessiblePatientIds(accountId: string): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT patient_id::text AS patient_id
       FROM (
         SELECT patient_id FROM patient_memberships WHERE account_id = $1
         UNION ALL
         SELECT id AS patient_id FROM patients WHERE owner_account_id = $1
       ) accessible`,
      [accountId],
    )
    return rows.map((r) => r.patient_id as string)
  }

  async listPatientIdsForAccount(accountId: string): Promise<string[]> {
    return this.listAccessiblePatientIds(accountId)
  }

  async ensureMembership(accountId: string, patientId: string, role = 'guardian') {
    await this.pool.query(
      `INSERT INTO patient_memberships (account_id, patient_id, role)
       VALUES ($1,$2,$3)
       ON CONFLICT (account_id, patient_id) DO NOTHING`,
      [accountId, patientId, role],
    )
  }

  async listRolesForAccount(accountId: string): Promise<Record<string, string>> {
    const { rows } = await this.pool.query(
      `SELECT patient_id, role FROM patient_memberships WHERE account_id = $1`,
      [accountId],
    )
    const map: Record<string, string> = {}
    for (const row of rows) {
      map[row.patient_id as string] = row.role as string
    }
    return map
  }

  async setSelfPatient(accountId: string, patientId: string): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE patient_memberships SET role = 'guardian' WHERE account_id = $1 AND role = 'self'`,
        [accountId],
      )
      await client.query(
        `INSERT INTO patient_memberships (account_id, patient_id, role)
         VALUES ($1, $2, 'self')
         ON CONFLICT (account_id, patient_id) DO UPDATE SET role = 'self'`,
        [accountId, patientId],
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}
