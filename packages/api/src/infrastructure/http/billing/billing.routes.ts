import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Stripe from 'stripe'
import {
  BillingService,
  billingPackageOffers,
  familyPlanMonthlyAllowance,
} from '../../../application/billing/billing.service.js'
import {
  formatBillingExportCsv,
  isBillingExportOperator,
  parseBillingExportMonth,
} from '../../../application/billing/billing-export.js'
import { HandwritingCreditsService } from '../../../application/handwriting/handwriting-credits.service.js'
import { LlmQuotaService } from '../../../application/llm/llm-quota.service.js'
import { HandwritingCreditsPgRepository } from '../../persistence/handwriting-credits.pg.repository.js'
import { LlmUsagePgRepository } from '../../persistence/llm-usage.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { resolveHandwritingScopeId } from '../handwriting/handwriting-scope.js'
import { ProductEventService } from '../../../application/telemetry/product-event.service.js'
import { ProductEventPgRepository } from '../../persistence/product-event.pg.repository.js'
import { trackServerProductEvent } from '../../../application/telemetry/server-product-event.js'
import { z } from 'zod'

const checkoutSchema = z.object({
  packageId: z.enum(['pack_10', 'pack_30']),
})

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' })
}

function webPublicBase(): string {
  return process.env.WEB_PUBLIC_URL?.trim() || 'http://localhost:5173'
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const end = sub.current_period_end
  return typeof end === 'number' && end > 0 ? new Date(end * 1000) : null
}

function resolveAccountIdFromSubscription(
  sub: Stripe.Subscription,
  billing: BillingService,
): Promise<string | null> {
  const fromMeta = sub.metadata?.accountId?.trim()
  if (fromMeta) return Promise.resolve(fromMeta)
  return billing.findAccountIdBySubscriptionId(sub.id)
}

async function ensureStripeCustomer(
  stripe: Stripe,
  billing: BillingService,
  accountId: string,
): Promise<string> {
  const entitlement = await billing.getOrCreateEntitlement(accountId)
  if (entitlement.stripeCustomerId) return entitlement.stripeCustomerId

  const email = await billing.getAccountEmail(accountId)
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { accountId },
  })
  await billing.setStripeCustomerId(accountId, customer.id)
  return customer.id
}

async function syncSubscriptionToAccount(
  billing: BillingService,
  accountId: string,
  sub: Stripe.Subscription,
  customerId?: string | null,
) {
  const activeStatuses = new Set(['active', 'trialing', 'past_due'])
  if (!activeStatuses.has(sub.status)) {
    await billing.downgradeToFree(accountId)
    return
  }
  await billing.applyFamilySubscription(accountId, {
    subscriptionId: sub.id,
    status: sub.status,
    customerId: customerId ?? (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id),
    currentPeriodEnd: subscriptionPeriodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  })
}

function entitlementJson(entitlement: Awaited<ReturnType<BillingService['getOrCreateEntitlement']>>) {
  return {
    ...entitlement,
    subscriptionCurrentPeriodEnd: entitlement.subscriptionCurrentPeriodEnd
      ? entitlement.subscriptionCurrentPeriodEnd.toISOString()
      : null,
  }
}

export async function billingRoutes(app: FastifyInstance) {
  const billing = new BillingService(pgPool)
  const productEvents = new ProductEventService(new ProductEventPgRepository(pgPool))
  const creditsRepo = new HandwritingCreditsPgRepository(pgPool)
  const credits = new HandwritingCreditsService(creditsRepo)
  const llmQuota = new LlmQuotaService(new LlmUsagePgRepository(pgPool), creditsRepo, credits)

  app.get('/billing/offers', async (_req, reply) => {
    const stripeEnabled = !!process.env.STRIPE_SECRET_KEY?.trim()
    return reply.send({
      stripeEnabled,
      packages: billingPackageOffers(),
      familyPlan: {
        tier: 'family',
        monthlyFreeAllowance: familyPlanMonthlyAllowance(),
        stripePriceId: process.env.STRIPE_PRICE_FAMILY_MONTHLY?.trim() || null,
      },
    })
  })

  app.get('/billing/me', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const entitlement = await billing.getOrCreateEntitlement(req.accountId)
    const scopeId = resolveHandwritingScopeId(req)
    const quota = await credits.getQuota(scopeId)
    const llmUsage = await llmQuota.getQuota(scopeId)
    const purchases = await billing.listPurchases(req.accountId)
    return reply.send({
      entitlement: entitlementJson(entitlement),
      quota,
      llmUsage,
      purchases,
      canExportBilling: isBillingExportOperator(req.accountId),
    })
  })

  app.get('/billing/export/contabilizei', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    if (!isBillingExportOperator(req.accountId)) {
      return reply.status(403).send({
        message: 'Export fiscal restrito — configure BILLING_EXPORT_ACCOUNT_IDS',
        code: 'BILLING_EXPORT_FORBIDDEN',
      })
    }

    const monthQ = (req.query as { month?: string }).month
    const { start, end, label } = parseBillingExportMonth(monthQ)
    const rows = await billing.exportContabilizeiRows(start, end)
    const csv = formatBillingExportCsv(rows)
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="billing-export-${label}.csv"`)
    return reply.send(csv)
  })

  app.post('/billing/checkout', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = checkoutSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const stripe = stripeClient()
    if (!stripe) {
      return reply.status(503).send({
        message: 'Pagamentos não configurados (STRIPE_SECRET_KEY ausente)',
        code: 'STRIPE_NOT_CONFIGURED',
      })
    }

    const pack = billingPackageOffers().find((p) => p.id === parsed.data.packageId)
    if (!pack) return reply.status(400).send({ message: 'Pacote inválido' })

    const priceId = pack.stripePriceId
    const webBase = webPublicBase()
    const customerId = await ensureStripeCustomer(stripe, billing, req.accountId)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [{
            price_data: {
              currency: pack.currency,
              unit_amount: pack.amountCents,
              product_data: { name: `AiyraCare — ${pack.label}` },
            },
            quantity: 1,
          }],
      success_url: `${webBase}/settings?billing=success`,
      cancel_url: `${webBase}/settings?billing=cancel`,
      metadata: {
        accountId: req.accountId,
        packageId: pack.id,
        packageCredits: String(pack.credits),
      },
    })

    if (!session.id) return reply.status(500).send({ message: 'Stripe não retornou session id' })

    await billing.createPurchasePending(req.accountId, {
      stripeSessionId: session.id,
      packageCredits: pack.credits,
      amountCents: pack.amountCents,
      currency: pack.currency,
      metadata: { packageId: pack.id },
    })

    return reply.send({ sessionId: session.id, url: session.url })
  })

  app.post('/billing/checkout-subscription', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const stripe = stripeClient()
    const priceId = process.env.STRIPE_PRICE_FAMILY_MONTHLY?.trim()
    if (!stripe || !priceId) {
      return reply.status(503).send({ message: 'Assinatura família não configurada', code: 'STRIPE_NOT_CONFIGURED' })
    }
    const webBase = webPublicBase()
    const customerId = await ensureStripeCustomer(stripe, billing, req.accountId)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${webBase}/settings?billing=subscription-success`,
      cancel_url: `${webBase}/settings?billing=cancel`,
      metadata: { accountId: req.accountId, plan: 'family' },
      subscription_data: { metadata: { accountId: req.accountId } },
    })
    return reply.send({ sessionId: session.id, url: session.url })
  })

  app.post('/billing/customer-portal', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const stripe = stripeClient()
    if (!stripe) {
      return reply.status(503).send({ message: 'Portal não configurado', code: 'STRIPE_NOT_CONFIGURED' })
    }

    const customerId = await ensureStripeCustomer(stripe, billing, req.accountId)
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${webPublicBase()}/settings`,
    })
    return reply.send({ url: portal.url })
  })

  app.post('/billing/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const stripe = stripeClient()
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    if (!stripe || !secret) {
      return reply.status(503).send({ message: 'Webhook Stripe não configurado' })
    }

    const sig = req.headers['stripe-signature']
    if (!sig || typeof sig !== 'string') {
      return reply.status(400).send({ message: 'stripe-signature ausente' })
    }

    const raw = (req as FastifyRequest & { rawBody?: Buffer }).rawBody
    if (!raw) return reply.status(400).send({ message: 'raw body ausente' })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(raw, sig, secret)
    } catch (err) {
      return reply.status(400).send({
        message: err instanceof Error ? err.message : 'Webhook inválido',
      })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.mode === 'subscription' && session.subscription) {
        const subId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id
        const accountId = session.metadata?.accountId?.trim()
          ?? (typeof session.customer === 'string' ? null : null)
        const sub = await stripe.subscriptions.retrieve(subId)
        const resolvedAccountId = accountId
          ?? sub.metadata?.accountId?.trim()
          ?? await billing.findAccountIdBySubscriptionId(sub.id)
        if (resolvedAccountId) {
          const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id
          await syncSubscriptionToAccount(billing, resolvedAccountId, sub, customerId)
        }
      } else {
        const completed = await billing.completePurchaseBySession(
          session.id,
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
        )
        if (completed) {
          await credits.grantPackage(completed.accountId, completed.packageCredits, {
            stripeSessionId: session.id,
            source: 'stripe_webhook',
          })
        }
        const accountId = session.metadata?.accountId?.trim()
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        if (accountId && customerId) {
          await billing.setStripeCustomerId(accountId, customerId)
        }
      }

      const completedAccountId = session.metadata?.accountId?.trim()
        ?? (session.mode === 'subscription' && session.subscription
          ? await billing.findAccountIdBySubscriptionId(
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
          )
          : null)
      if (completedAccountId) {
        await trackServerProductEvent(productEvents, completedAccountId, {
          eventName: 'billing_checkout_completed',
          properties: {
            checkout_kind: session.mode === 'subscription' ? 'subscription' : 'pack',
            package_id: session.metadata?.packageId ?? (session.mode === 'subscription' ? 'family' : 'unknown'),
            status: 'completed',
          },
        })
      }
    }

    if (
      event.type === 'customer.subscription.updated'
      || event.type === 'customer.subscription.created'
    ) {
      const sub = event.data.object as Stripe.Subscription
      const accountId = await resolveAccountIdFromSubscription(sub, billing)
      if (accountId) {
        await syncSubscriptionToAccount(billing, accountId, sub)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const accountId = await resolveAccountIdFromSubscription(sub, billing)
      if (accountId) {
        await billing.downgradeToFree(accountId)
      }
    }

    return reply.send({ received: true })
  })
}
