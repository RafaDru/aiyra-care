import type { Pool } from 'pg'
import type { FileStorage } from '../../domain/document/file-storage.js'
import type { AuthIdentityDeletionPort } from '../../domain/auth/auth-identity-deletion.port.js'

export interface AccountDeletionResult {
  deletedAccountId: string
  deletedPatientIds: string[]
  removedMemberships: number
}

export class AccountDeletionService {
  constructor(
    private readonly pool: Pool,
    private readonly fileStorage: FileStorage,
    private readonly identityDeletion: AuthIdentityDeletionPort | null,
    private readonly stripeCancelSubscription?: (subscriptionId: string) => Promise<void>,
  ) {}

  async deleteAccount(accountId: string, authSubject: string): Promise<AccountDeletionResult> {
    const entitlement = await this.loadSubscriptionId(accountId)
    if (entitlement?.stripeSubscriptionId && this.stripeCancelSubscription) {
      try {
        await this.stripeCancelSubscription(entitlement.stripeSubscriptionId)
      } catch {
        // Stripe failure não impede exclusão local — assinatura pode já estar cancelada
      }
    }

    const client = await this.pool.connect()
    let deletedPatientIds: string[] = []
    let removedMemberships = 0

    try {
      await client.query('BEGIN')

      const { rows: owned } = await client.query<{ id: string }>(
        `SELECT id FROM patients WHERE owner_account_id = $1`,
        [accountId],
      )
      deletedPatientIds = owned.map((r) => r.id)

      for (const patientId of deletedPatientIds) {
        await this.deletePatientFiles(patientId)
        await client.query(`DELETE FROM patients WHERE id = $1`, [patientId])
      }

      const membershipResult = await client.query(
        `DELETE FROM patient_memberships WHERE account_id = $1`,
        [accountId],
      )
      removedMemberships = membershipResult.rowCount ?? 0

      await client.query(`DELETE FROM handwriting_credit_events WHERE scope_id = $1`, [accountId])
      await client.query(`DELETE FROM handwriting_credit_accounts WHERE scope_id = $1`, [accountId])

      const accountResult = await client.query(`DELETE FROM app_accounts WHERE id = $1`, [accountId])
      if ((accountResult.rowCount ?? 0) === 0) {
        throw new Error('Conta não encontrada')
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    if (this.identityDeletion) {
      try {
        await this.identityDeletion.deleteUser(authSubject)
      } catch {
        // Conta PG já removida; log em produção
      }
    }

    return {
      deletedAccountId: accountId,
      deletedPatientIds,
      removedMemberships,
    }
  }

  private async loadSubscriptionId(accountId: string): Promise<{ stripeSubscriptionId: string | null } | null> {
    const { rows } = await this.pool.query<{ stripe_subscription_id: string | null }>(
      `SELECT stripe_subscription_id FROM account_entitlements WHERE account_id = $1`,
      [accountId],
    )
    return rows[0] ? { stripeSubscriptionId: rows[0].stripe_subscription_id } : null
  }

  private async deletePatientFiles(patientId: string): Promise<void> {
    const { rows } = await this.pool.query<{ storage_path: string }>(
      `SELECT storage_path FROM documents WHERE patient_id = $1 AND storage_path IS NOT NULL`,
      [patientId],
    )
    const examRows = await this.pool.query<{ result_file_url: string | null }>(
      `SELECT result_file_url FROM exams WHERE patient_id = $1 AND result_file_url IS NOT NULL`,
      [patientId],
    )
    const paths = [
      ...rows.map((r) => r.storage_path),
      ...examRows.rows
        .map((r) => r.result_file_url)
        .filter((u): u is string => typeof u === 'string' && u.startsWith('patients/')),
    ]
    for (const path of paths) {
      try {
        await this.fileStorage.delete(path)
      } catch {
        // continua exclusão PG mesmo se GCS falhar
      }
    }
  }
}
