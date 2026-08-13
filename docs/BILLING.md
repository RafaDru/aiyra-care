# Billing (Stripe) — monetização SaaS

> **Última atualização:** 2026-08-13 — UI em `/settings/plan`. Doc infra GCP: `docs/infra/GCP_BILLING_ALERTS.md`.

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PACK_10=
STRIPE_PRICE_PACK_30=
STRIPE_PRICE_FAMILY_MONTHLY=
WEB_PUBLIC_URL=http://localhost:5173
BILLING_FAMILY_MONTHLY_FREE=40
BILLING_FREE_MONTHLY_FREE=10

## Webhooks (configurar no Stripe Dashboard)

Eventos recomendados:

- `checkout.session.completed` — pacotes + primeira assinatura
- `customer.subscription.created`
- `customer.subscription.updated` — status, renovação, cancel_at_period_end
- `customer.subscription.deleted` — downgrade para plano grátis

## Customer Portal

Ative o **Customer Portal** no Stripe Dashboard (Billing → Customer portal).
A UI chama `POST /billing/customer-portal` → redirect para cancelar assinatura ou trocar cartão.
