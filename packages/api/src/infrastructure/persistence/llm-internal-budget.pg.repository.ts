import type { Pool } from 'pg'
import type { LlmInternalBudgetAccount } from '../../domain/llm/llm.types.js'

/** Escopo global para o custo operacional interno (não é conta de cliente). */
export const INTERNAL_OPS_SCOPE_ID = 'internal-operations'

function currentMonthPeriod(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export class LlmInternalBudgetPgRepository {
  constructor(private readonly pool: Pool) {}

  async getOrCreate(): Promise<LlmInternalBudgetAccount> {
    const period = currentMonthPeriod()
    const { rows } = await this.pool.query(
      `INSERT INTO llm_internal_budget (scope_id, monthly_cost_cents, monthly_period)
       VALUES ($1, 0, $2)
       ON CONFLICT (scope_id) DO UPDATE SET scope_id = EXCLUDED.scope_id
       RETURNING scope_id, monthly_cost_cents, monthly_period`,
      [INTERNAL_OPS_SCOPE_ID, period],
    )
    const account: LlmInternalBudgetAccount = {
      scopeId: rows[0].scope_id as string,
      monthlyCostCents: Number(rows[0].monthly_cost_cents),
      monthlyPeriod: rows[0].monthly_period as string,
    }
    if (account.monthlyPeriod !== period) {
      const reset: LlmInternalBudgetAccount = {
        ...account,
        monthlyPeriod: period,
        monthlyCostCents: 0,
      }
      await this.save(reset)
      return reset
    }
    return account
  }

  async save(account: LlmInternalBudgetAccount): Promise<void> {
    await this.pool.query(
      `UPDATE llm_internal_budget
       SET monthly_cost_cents = $2, monthly_period = $3, updated_at = NOW()
       WHERE scope_id = $1`,
      [account.scopeId, account.monthlyCostCents, account.monthlyPeriod],
    )
  }
}
