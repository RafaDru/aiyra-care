# Preparação técnica go-live

> **Revisão de conteúdo** (advogado, contador, médico) continua em [`HUMAN_REVIEW_QUEUE.md`](./HUMAN_REVIEW_QUEUE.md).

## Já entregue no código

- Compliance gate, cookie banner, consentimento menor
- `GET /compliance/go-live-status` + card em Configurações → Legal
- 4 documentos legais seed + páginas/modal; `LEGAL_CONTENT_ADAPTER` fs/http/gcs
- Billing Stripe (checkout, webhook, portal, assinatura, export Contabilizei)
- Agenda: `scheduled_events`, ICS import, **Google Calendar + Outlook OAuth**
- Configurações estruturadas `/settings/*` (general, account, plan, legal)
- Export clínico resumido/completo + share link 48h
- Exclusão de conta LGPD
- PR template + tier3 CI workflow

## Variáveis de produção (`.env` API)

```env
LEGAL_ENTITY_NAME=
LEGAL_CNPJ=
LEGAL_PRIVACY_EMAIL=
LEGAL_SUPPORT_EMAIL=
LEGAL_DPO_SLA_DAYS=15
COMPLIANCE_GATE_ENABLED=1

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_FAMILY_MONTHLY=
STRIPE_PRICE_PACK_10=
STRIPE_PRICE_PACK_30=
BILLING_FAMILY_MONTHLY_CENTS=1990
BILLING_EXPORT_ACCOUNT_IDS=<uuid-da-conta-operador>
WEB_PUBLIC_URL=https://...
```

## Checklist rápido

1. Migration `031` + seed legal documents
2. `COMPLIANCE_GATE_ENABLED=1`
3. Stripe live + webhook HTTPS
4. `BILLING_EXPORT_ACCOUNT_IDS` com UUID da conta operador
5. Enviar pacote jurídico ao advogado
6. Contabilizei: import Stripe + export CSV mensal

## UI

- **Configurações → Conta** — go-live checklist, contato DPO, export Contabilizei (operador)
- **Roadmap** — badges de revisão humana pendente
