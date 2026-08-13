# NFS-e e conciliação Stripe — Contabilizei

> **Status:** processo operacional — não automatizado no app no MVP.  
> Epic roadmap: `legal-fiscal-nfse`.

## Objetivo

Emitir **nota fiscal de serviço (NFS-e)** para cada cobrança recorrente ou pacote avulso, e conciliar com o extrato Stripe na Contabilizei.

## Fluxo recomendado (PJ + Contabilizei)

1. **Stripe** recebe pagamento (cartão no Checkout / Customer Portal).
2. **Extrato Stripe** (Dashboard ou payout) → importar na Contabilizei periodicamente.
3. **NFS-e** — emitir nota por receita de software/SaaS conforme orientação do contador (municipio BH ou domicílio fiscal).
4. Conciliar: valor bruto, taxa Stripe, valor líquido na conta PJ.

## Dados no AiyraCare

| Fonte | Onde |
|-------|------|
| Pacotes avulsos | `billing_purchases` (status `completed`) |
| Assinatura família | `account_entitlements` + webhooks Stripe |
| Export mensal | `node packages/api/scripts/export-billing-contabilizei.mjs` ou **Configurações → Plano** (operador com `BILLING_EXPORT_ACCOUNT_IDS`) |

## Campos úteis para a nota

- Tomador: e-mail da `app_accounts` + nome do `account_profiles.full_name` se houver
- Descrição: "Assinatura AiyraCare plano família" ou "Pacote N interpretações manuscrito"
- Valor: `amount_cents` / 100 (BRL)
- Referência Stripe: `stripe_session_id` ou `stripe_payment_intent_id`

## Stripe live

- Conta Stripe **PJ** vinculada ao CNPJ da operação.
- Payout na conta bancária cadastrada na Contabilizei.

## Checklist go-live fiscal

- [ ] CNPJ ativo e serviço enquadrado com contador
- [ ] Credenciais NFS-e municipal (se emissão manual)
- [ ] Processo Contabilizei para import Stripe documentado
- [ ] Primeira nota de teste em ambiente Stripe test mode (opcional)

## Relacionado

- [`docs/BILLING.md`](../BILLING.md)
- [`docs/ACCOUNT_AND_PLAN.md`](../ACCOUNT_AND_PLAN.md)
