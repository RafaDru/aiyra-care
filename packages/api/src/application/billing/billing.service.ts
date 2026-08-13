import type { Pool } from 'pg'
import type { BillingExportRow } from './billing-export.js'

export type PlanTier = 'free' | 'family'

export interface AccountEntitlement {
  accountId: string
  planTier: PlanTier
  monthlyFreeAllowance: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: string | null
  subscriptionCurrentPeriodEnd: Date | null
  subscriptionCancelAtPeriodEnd: boolean
}

export interface BillingPurchase {
  id: string
  accountId: string
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  packageCredits: number
  amountCents: number
  currency: string
  status: string
  metadata: Record<string, unknown> | null
  createdAt: Date
  completedAt: Date | null
}

export interface BillingPackageOffer {
  id: string
  credits: number
  amountCents: number
  currency: string
  label: string
  stripePriceId?: string
}

export function billingPackageOffers(): BillingPackageOffer[] {
  const packs: Array<{ id: string; credits: number; amountCents: number; envKey: string }> = [
    { id: 'pack_10', credits: 10, amountCents: 2900, envKey: 'STRIPE_PRICE_PACK_10' },
    { id: 'pack_30', credits: 30, amountCents: 6900, envKey: 'STRIPE_PRICE_PACK_30' },
  ]
  return packs.map((p) => ({
    id: p.id,
    credits: p.credits,
    amountCents: p.amountCents,
    currency: 'brl',
    label: `${p.credits} interpretações`,
    stripePriceId: process.env[p.envKey]?.trim() || undefined,
  }))
}

export function familyPlanMonthlyAllowance(): number {
  const n = Number(process.env.BILLING_FAMILY_MONTHLY_FREE ?? 40)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40
}

/** Valor referência da assinatura família (centavos) — para export fiscal; conferir Stripe. */
export function familyPlanMonthlyCents(): number {
  const n = Number(process.env.BILLING_FAMILY_MONTHLY_CENTS ?? 1990)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1990
}

export function freePlanMonthlyAllowance(): number {
  const n = Number(process.env.BILLING_FREE_MONTHLY_FREE ?? 10)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10
}

export class BillingService {
  constructor(private readonly pool: Pool) {}

  async getOrCreateEntitlement(accountId: string): Promise<AccountEntitlement> {
    const { rows } = await this.pool.query(
      `INSERT INTO account_entitlements (account_id)
       VALUES ($1)
       ON CONFLICT (account_id) DO NOTHING`,
      [accountId],
    )
    void rows
    const { rows: found } = await this.pool.query(
      `SELECT account_id, plan_tier, monthly_free_allowance,
              stripe_customer_id, stripe_subscription_id, subscription_status,
              subscription_current_period_end, subscription_cancel_at_period_end
       FROM account_entitlements WHERE account_id = $1`,
      [accountId],
    )
    const row = found[0]
    if (!row) {
      const freeAllowance = freePlanMonthlyAllowance()
      return {
        accountId,
        planTier: 'free',
        monthlyFreeAllowance: freeAllowance,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        subscriptionCurrentPeriodEnd: null,
        subscriptionCancelAtPeriodEnd: false,
      }
    }
    return {
      accountId: row.account_id as string,
      planTier: row.plan_tier as PlanTier,
      monthlyFreeAllowance: Number(row.monthly_free_allowance),
      stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
      stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
      subscriptionStatus: (row.subscription_status as string | null) ?? null,
      subscriptionCurrentPeriodEnd: row.subscription_current_period_end
        ? new Date(row.subscription_current_period_end as string | Date)
        : null,
      subscriptionCancelAtPeriodEnd: Boolean(row.subscription_cancel_at_period_end),
    }
  }

  async getAccountEmail(accountId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT email FROM app_accounts WHERE id = $1`,
      [accountId],
    )
    const email = rows[0]?.email
    return typeof email === 'string' && email.trim() ? email.trim() : null
  }

  async setStripeCustomerId(accountId: string, customerId: string) {
    await this.pool.query(
      `INSERT INTO account_entitlements (account_id, stripe_customer_id)
       VALUES ($1, $2)
       ON CONFLICT (account_id) DO UPDATE SET
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         updated_at = NOW()`,
      [accountId, customerId],
    )
  }

  async findAccountIdBySubscriptionId(subscriptionId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT account_id FROM account_entitlements WHERE stripe_subscription_id = $1`,
      [subscriptionId],
    )
    return (rows[0]?.account_id as string | undefined) ?? null
  }

  async syncHandwritingAllowance(accountId: string, allowance: number) {
    await this.pool.query(
      `UPDATE handwriting_credit_accounts
       SET monthly_free_allowance = $2, updated_at = NOW()
       WHERE scope_id = $1`,
      [accountId, allowance],
    )
  }

  async listPurchases(accountId: string, limit = 50): Promise<BillingPurchase[]> {
    const { rows } = await this.pool.query(
      `SELECT id, account_id, stripe_session_id, stripe_payment_intent_id,
              package_credits, amount_cents, currency, status, metadata, created_at, completed_at
       FROM billing_purchases
       WHERE account_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [accountId, limit],
    )
    return rows.map((row) => ({
      id: row.id as string,
      accountId: row.account_id as string,
      stripeSessionId: (row.stripe_session_id as string | null) ?? null,
      stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
      packageCredits: Number(row.package_credits),
      amountCents: Number(row.amount_cents),
      currency: row.currency as string,
      status: row.status as string,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.created_at as Date,
      completedAt: (row.completed_at as Date | null) ?? null,
    }))
  }

  async createPurchasePending(
    accountId: string,
    data: {
      stripeSessionId: string
      packageCredits: number
      amountCents: number
      currency: string
      metadata?: Record<string, unknown>
    },
  ) {
    const { rows } = await this.pool.query(
      `INSERT INTO billing_purchases (
         account_id, stripe_session_id, package_credits, amount_cents, currency, status, metadata
       ) VALUES ($1,$2,$3,$4,$5,'pending',$6::jsonb)
       RETURNING id`,
      [
        accountId,
        data.stripeSessionId,
        data.packageCredits,
        data.amountCents,
        data.currency,
        JSON.stringify(data.metadata ?? {}),
      ],
    )
    return rows[0].id as string
  }

  async completePurchaseBySession(
    stripeSessionId: string,
    paymentIntentId?: string,
  ): Promise<{ accountId: string; packageCredits: number } | null> {
    const { rows } = await this.pool.query(
      `UPDATE billing_purchases
       SET status = 'completed',
           stripe_payment_intent_id = COALESCE($2, stripe_payment_intent_id),
           completed_at = NOW()
       WHERE stripe_session_id = $1 AND status = 'pending'
       RETURNING account_id, package_credits`,
      [stripeSessionId, paymentIntentId ?? null],
    )
    if (!rows.length) return null
    return {
      accountId: rows[0].account_id as string,
      packageCredits: Number(rows[0].package_credits),
    }
  }

  async applyFamilySubscription(
    accountId: string,
    data: {
      subscriptionId: string
      status: string
      customerId?: string | null
      currentPeriodEnd?: Date | null
      cancelAtPeriodEnd?: boolean
    },
  ) {
    const allowance = familyPlanMonthlyAllowance()
    await this.pool.query(
      `INSERT INTO account_entitlements (
         account_id, plan_tier, monthly_free_allowance,
         stripe_customer_id, stripe_subscription_id, subscription_status,
         subscription_current_period_end, subscription_cancel_at_period_end
       )
       VALUES ($1, 'family', $2, $3, $4, $5, $6, $7)
       ON CONFLICT (account_id) DO UPDATE SET
         plan_tier = 'family',
         monthly_free_allowance = $2,
         stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, account_entitlements.stripe_customer_id),
         stripe_subscription_id = $4,
         subscription_status = $5,
         subscription_current_period_end = $6,
         subscription_cancel_at_period_end = $7,
         updated_at = NOW()`,
      [
        accountId,
        allowance,
        data.customerId ?? null,
        data.subscriptionId,
        data.status,
        data.currentPeriodEnd ?? null,
        data.cancelAtPeriodEnd ?? false,
      ],
    )
    await this.syncHandwritingAllowance(accountId, allowance)
  }

  async downgradeToFree(accountId: string) {
    const allowance = freePlanMonthlyAllowance()
    await this.pool.query(
      `UPDATE account_entitlements SET
         plan_tier = 'free',
         monthly_free_allowance = $2,
         stripe_subscription_id = NULL,
         subscription_status = NULL,
         subscription_current_period_end = NULL,
         subscription_cancel_at_period_end = FALSE,
         updated_at = NOW()
       WHERE account_id = $1`,
      [accountId, allowance],
    )
    await this.syncHandwritingAllowance(accountId, allowance)
  }

  async exportContabilizeiRows(start: Date, end: Date): Promise<BillingExportRow[]> {
    const { rows: purchases } = await this.pool.query(
      `SELECT bp.completed_at, bp.package_credits, bp.amount_cents, bp.currency,
              bp.stripe_session_id, bp.stripe_payment_intent_id,
              aa.email AS account_email, ap.full_name AS account_full_name
       FROM billing_purchases bp
       JOIN app_accounts aa ON aa.id = bp.account_id
       LEFT JOIN account_profiles ap ON ap.account_id = bp.account_id
       WHERE bp.status = 'completed'
         AND bp.completed_at >= $1 AND bp.completed_at < $2
       ORDER BY bp.completed_at`,
      [start, end],
    )

    const packageRows: BillingExportRow[] = purchases.map((r) => {
      const credits = Number(r.package_credits)
      return {
        kind: 'package',
        completedAt: r.completed_at ? new Date(r.completed_at as string | Date).toISOString() : '',
        accountEmail: (r.account_email as string) ?? '',
        accountFullName: (r.account_full_name as string | null) ?? null,
        amountBrl: (Number(r.amount_cents) / 100).toFixed(2),
        description: `Pacote ${credits} interpretações manuscrito`,
        packageCredits: credits,
        currency: (r.currency as string) ?? 'brl',
        stripeSessionId: (r.stripe_session_id as string | null) ?? null,
        stripePaymentIntentId: (r.stripe_payment_intent_id as string | null) ?? null,
        stripeSubscriptionId: null,
      }
    })

    const { rows: subs } = await this.pool.query(
      `SELECT ae.stripe_subscription_id, ae.subscription_status,
              aa.email AS account_email, ap.full_name AS account_full_name
       FROM account_entitlements ae
       JOIN app_accounts aa ON aa.id = ae.account_id
       LEFT JOIN account_profiles ap ON ap.account_id = ae.account_id
       WHERE ae.plan_tier = 'family'
         AND ae.subscription_status IN ('active', 'trialing', 'past_due')`,
    )

    const refAmount = (familyPlanMonthlyCents() / 100).toFixed(2)
    const refDate = start.toISOString()
    const subscriptionRows: BillingExportRow[] = subs.map((r) => ({
      kind: 'subscription_reference',
      completedAt: refDate,
      accountEmail: (r.account_email as string) ?? '',
      accountFullName: (r.account_full_name as string | null) ?? null,
      amountBrl: refAmount,
      description: 'Assinatura AiyraCare plano família (valor referência — conferir Stripe)',
      packageCredits: null,
      currency: 'brl',
      stripeSessionId: null,
      stripePaymentIntentId: null,
      stripeSubscriptionId: (r.stripe_subscription_id as string | null) ?? null,
    }))

    return [...packageRows, ...subscriptionRows]
  }
}
