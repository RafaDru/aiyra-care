# Billing (Stripe) — monetização SaaS

> **Última atualização:** 2026-08-17 — UI em `/settings/plan`. Doc infra GCP: `docs/infra/GCP_BILLING_ALERTS.md`.

## Variáveis de ambiente

| Variável | Quem usa | Descrição |
|----------|----------|-----------|
| `STRIPE_SECRET_KEY` | API (`packages/api`) | Secret key `sk_test_` ou `sk_live_` para Checkout, Portal e webhook |
| `STRIPE_WEBHOOK_SECRET` | API | Signing secret `whsec_` do endpoint ou `stripe listen` |
| `STRIPE_PRICE_PACK_10` | API | Price ID pacote 10 créditos (R$ 29) |
| `STRIPE_PRICE_PACK_30` | API | Price ID pacote 30 créditos (R$ 69) |
| `STRIPE_PRICE_FAMILY_MONTHLY` | API | Price ID assinatura família mensal (default R$ 19,90) |
| `WEB_PUBLIC_URL` | API | Base da web para `success_url` / `cancel_url` |
| `BILLING_FAMILY_MONTHLY_FREE` | API | Créditos LLM/mês no plano família (default 40) |
| `BILLING_FREE_MONTHLY_FREE` | API | Créditos LLM/mês no plano grátis (default 10) |
| `BILLING_EXPORT_ACCOUNT_IDS` | API | UUID(s) com permissão de export CSV fiscal |
| `STRIPE_AGENT_KEY` | **Cursor MCP** | Credencial do plugin Stripe para o agente configurar a conta |
| `STRIPE_AGENT_TOKEN` | **Cursor MCP** | Token do plugin Stripe — **não** substitui `STRIPE_SECRET_KEY` na API |

Exemplo `.env` local (valores de teste na sandbox **Área restrita de Aiyra Care**):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PACK_10=price_1U5SfoC13WtRzmy67c4MZPbs
STRIPE_PRICE_PACK_30=price_1U5SfpC13WtRzmy6GOAZMnTY
STRIPE_PRICE_FAMILY_MONTHLY=price_1U5SfrC13WtRzmy6o5ILX9Wt
WEB_PUBLIC_URL=http://localhost:5173
```

Dashboard (test): [API keys](https://dashboard.stripe.com/acct_1U5STtC13WtRzmy6/test/apikeys) · [Products](https://dashboard.stripe.com/acct_1U5STtC13WtRzmy6/test/products) · [Webhooks](https://dashboard.stripe.com/acct_1U5STtC13WtRzmy6/test/webhooks)

## Produtos (sandbox test — 2026-08-17)

| Oferta | Lookup key | Price ID | Valor |
|--------|------------|----------|-------|
| 10 interpretações | `pack_10` | `price_1U5SfoC13WtRzmy67c4MZPbs` | R$ 29,00 (one-time) |
| 30 interpretações | `pack_30` | `price_1U5SfpC13WtRzmy6GOAZMnTY` | R$ 69,00 (one-time) |
| Plano Família | `family_monthly` | `price_1U5SfrC13WtRzmy6o5ILX9Wt` | R$ 19,90/mês |

## Webhooks

Eventos recomendados:

- `checkout.session.completed` — pacotes + primeira assinatura
- `customer.subscription.created`
- `customer.subscription.updated` — status, renovação, `cancel_at_period_end`
- `customer.subscription.deleted` — downgrade para plano grátis

**Local:** Stripe não alcança `127.0.0.1`. Opções:

1. **Stripe CLI** (recomendado): `winget install Stripe.StripeCli` · `powershell -File scripts/stripe-listen.ps1` (encaminha a `http://127.0.0.1:3010/billing/webhook`). O signing secret inicial: `stripe listen --api-key sk_test_... --forward-to http://127.0.0.1:3010/billing/webhook --print-secret` → `STRIPE_WEBHOOK_SECRET` no `.env`.
2. **Tunnel** (ngrok/cloudflared) + endpoint no Dashboard apontando a `https://…/billing/webhook`.

**Produção:** `POST https://<api>/billing/webhook` com os eventos acima.

## Customer Portal

Portal ativo na sandbox test (config `bpc_1U5U43C13WtRzmy6ejmRFuGS`):

| Recurso | Status |
|---------|--------|
| Login page (test) | `https://billing.stripe.com/p/login/test_7sYcN442mgEufQC1Xu3ks00` |
| Atualizar cartão / dados | Habilitado |
| Histórico de faturas | Habilitado |
| Cancelar assinatura | Habilitado (`at_period_end`) |

**Dois caminhos:**

1. **Na app** — `/settings/plan` → **Gerenciar assinatura** chama `POST /billing/customer-portal` e abre sessão Stripe já vinculada ao `stripe_customer_id` da conta (requer ter feito checkout ou assinatura antes).
2. **Link direto (test)** — o login page acima: cliente digita o e-mail do Stripe Customer e recebe link por e-mail. Útil para suporte/manual; não substitui o botão na app.

Opcional no Dashboard: **default return URL** → `http://localhost:5173/settings` (volta à app após o portal).

Dashboard: [Customer portal settings](https://dashboard.stripe.com/acct_1U5STtC13WtRzmy6/test/settings/billing/portal)

## Rotas API

| Método | Rota | Uso |
|--------|------|-----|
| `GET` | `/billing/status` | Plano, créditos, pacotes |
| `POST` | `/billing/checkout` | Checkout pacote (`pack_10` / `pack_30`) |
| `POST` | `/billing/checkout-subscription` | Checkout assinatura família |
| `POST` | `/billing/customer-portal` | Portal do cliente |
| `POST` | `/billing/webhook` | Webhook Stripe (raw body) |
