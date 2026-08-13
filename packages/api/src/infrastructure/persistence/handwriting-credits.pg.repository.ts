import type { Pool } from 'pg'
import type {
  HandwritingCreditAccount,
  HandwritingCreditsRepository,
} from '../../domain/document/handwriting-understanding.js'
import { normalizeMonthlyPeriod } from '../../domain/document/handwriting-policy.js'

export class HandwritingCreditsPgRepository implements HandwritingCreditsRepository {
  constructor(private readonly pool: Pool) {}

  async getOrCreateAccount(scopeId: string, defaultMonthlyFree: number): Promise<HandwritingCreditAccount> {
    let allowance = defaultMonthlyFree
    if (/^[0-9a-f-]{36}$/i.test(scopeId)) {
      const ent = await this.pool.query(
        `SELECT monthly_free_allowance FROM account_entitlements WHERE account_id = $1::uuid`,
        [scopeId],
      )
      if (ent.rows.length) {
        allowance = Number(ent.rows[0].monthly_free_allowance)
      }
    }
    const { rows } = await this.pool.query(
      `INSERT INTO handwriting_credit_accounts (scope_id, monthly_free_allowance)
       VALUES ($1, $2)
       ON CONFLICT (scope_id) DO UPDATE SET scope_id = EXCLUDED.scope_id
       RETURNING scope_id, package_credits, monthly_free_allowance, monthly_free_used, monthly_period`,
      [scopeId, allowance],
    )
    const row = rows[0] as Record<string, unknown>
    const account: HandwritingCreditAccount = {
      scopeId: row.scope_id as string,
      packageCredits: Number(row.package_credits),
      monthlyFreeAllowance: Number(row.monthly_free_allowance),
      monthlyFreeUsed: Number(row.monthly_free_used),
      monthlyPeriod: row.monthly_period as string,
    }
    const normalized = normalizeMonthlyPeriod(account)
    if (normalized.monthlyPeriod !== account.monthlyPeriod || normalized.monthlyFreeUsed !== account.monthlyFreeUsed) {
      await this.saveAccount(normalized)
      return normalized
    }
    return account
  }

  async saveAccount(account: HandwritingCreditAccount): Promise<void> {
    await this.pool.query(
      `UPDATE handwriting_credit_accounts
       SET package_credits = $2,
           monthly_free_allowance = $3,
           monthly_free_used = $4,
           monthly_period = $5,
           updated_at = NOW()
       WHERE scope_id = $1`,
      [
        account.scopeId,
        account.packageCredits,
        account.monthlyFreeAllowance,
        account.monthlyFreeUsed,
        account.monthlyPeriod,
      ],
    )
  }

  async appendEvent(input: {
    scopeId: string
    documentId?: string
    eventType: string
    creditsDelta: number
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO handwriting_credit_events (scope_id, document_id, event_type, credits_delta, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.scopeId,
        input.documentId ?? null,
        input.eventType,
        input.creditsDelta,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    )
  }
}
