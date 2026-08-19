import type { Pool } from 'pg'
import type { LlmUsageAccount, LlmUsageEventInput } from '../../domain/llm/llm.types.js'
import { normalizeLlmUsagePeriod } from '../../domain/llm/llm-policy.js'

export class LlmUsagePgRepository {
  constructor(private readonly pool: Pool) {}

  async getOrCreateUsageAccount(scopeId: string): Promise<LlmUsageAccount> {
    const { rows } = await this.pool.query(
      `INSERT INTO llm_usage_accounts (scope_id)
       VALUES ($1)
       ON CONFLICT (scope_id) DO UPDATE SET scope_id = EXCLUDED.scope_id
       RETURNING scope_id, monthly_tokens_used, monthly_period`,
      [scopeId],
    )
    const row = rows[0] as Record<string, unknown>
    const account: LlmUsageAccount = {
      scopeId: row.scope_id as string,
      monthlyTokensUsed: Number(row.monthly_tokens_used),
      monthlyPeriod: row.monthly_period as string,
    }
    const normalized = normalizeLlmUsagePeriod(account)
    if (
      normalized.monthlyPeriod !== account.monthlyPeriod
      || normalized.monthlyTokensUsed !== account.monthlyTokensUsed
    ) {
      await this.saveUsageAccount(normalized)
      return normalized
    }
    return account
  }

  async saveUsageAccount(account: LlmUsageAccount): Promise<void> {
    await this.pool.query(
      `UPDATE llm_usage_accounts
       SET monthly_tokens_used = $2, monthly_period = $3, updated_at = NOW()
       WHERE scope_id = $1`,
      [account.scopeId, account.monthlyTokensUsed, account.monthlyPeriod],
    )
  }

  async appendEvent(input: LlmUsageEventInput): Promise<string> {
    const { rows } = await this.pool.query(
      `INSERT INTO llm_usage_events (
         scope_id, account_id, feature, patient_id, conversation_id,
         provider, model, tier, tokens_in, tokens_out, tokens_total,
         usage_source, estimated_cost_cents, cost_bucket, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
       RETURNING id`,
      [
        input.scopeId,
        input.accountId ?? null,
        input.feature,
        input.patientId ?? null,
        input.conversationId ?? null,
        input.provider,
        input.model,
        input.tier,
        input.tokensIn,
        input.tokensOut,
        input.tokensTotal,
        input.usageSource,
        input.estimatedCostCents ?? null,
        input.costBucket ?? 'client',
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    )
    return rows[0].id as string
  }

  /** Indicadores agregados da classificação interna em `period` (YYYY-MM) — observabilidade. */
  async internalClassificationStats(period?: string): Promise<{
    calls: number
    llmResolved: number
    localFallback: number
    budgetExhausted: number
    totalCostUsdCents: number
  }> {
    const p = period ?? `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
    const { rows } = await this.pool.query(
      `SELECT
         COUNT(*)::int AS calls,
         COUNT(*) FILTER (WHERE provider <> 'rules-fuzzy' AND provider <> 'budget')::int AS llm_resolved,
         COUNT(*) FILTER (WHERE metadata->>'outcome' = 'local_fallback')::int AS local_fallback,
         COUNT(*) FILTER (WHERE metadata->>'outcome' = 'budget_exhausted')::int AS budget_exhausted,
         COALESCE(SUM(estimated_cost_cents), 0)::int AS total_cost_usd_cents
       FROM llm_usage_events
       WHERE feature = 'label_classification'
         AND cost_bucket = 'internal'
         AND to_char(created_at, 'YYYY-MM') = $1`,
      [p],
    )
    const row = rows[0] as Record<string, unknown>
    return {
      calls: Number(row.calls),
      llmResolved: Number(row.llm_resolved),
      localFallback: Number(row.local_fallback),
      budgetExhausted: Number(row.budget_exhausted),
      totalCostUsdCents: Number(row.total_cost_usd_cents),
    }
  }
}
