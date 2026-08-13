# Conta, plano e assinaturas — AiyraCare

> **Última atualização:** 2026-08-13  
> UI: **Configurações** com sub-rotas (`/settings/*`).

## Mapa da área Configurações

| Rota | Conteúdo | Componentes |
|------|----------|-------------|
| `/settings/general` | Tema, idioma, dev tools | `SettingsGeneralPage` |
| `/settings/account` | Perfil estendido, exclusão de conta | `AccountProfileCard`, `DeleteAccountCard` |
| `/settings/plan` | Franquia, pacotes, assinatura Stripe | `BillingSettingsCard` |
| `/settings/legal` | Aceites, go-live, canal DPO | `SettingsComplianceCard`, `LegalGoLiveCard`, `LegalContactCard` |

`/settings` redireciona a `/settings/general`. Navegação: `SettingsLayout` (menu horizontal).

Constantes: `packages/web/src/lib/settings-paths.ts`.

## Objetivo por sub-área

- **Conta** — identidade (e-mail), contato, redes; sem billing.
- **Plano** — tier (grátis / família), créditos, checkout, portal Stripe.
- **Legal** — aceites pendentes, checklist go-live, privacidade/DPO.

## API (inalterada)

| Item | Onde |
|------|------|
| Perfil | `GET/PATCH /auth/profile` |
| Billing | `GET /billing/me`, checkout, `POST /billing/customer-portal` |
| Compliance | `GET /compliance/status`, `GET /compliance/go-live-status` |
| Exclusão | `DELETE /auth/account` |

## Backlog fiscal (fora desta UI)

| Item | id roadmap |
|------|------------|
| NFS-e / Contabilizei | `legal-fiscal-nfse` |

## Relacionado

- [`BILLING.md`](./BILLING.md) — variáveis Stripe
- [`LEGAL_COMPLIANCE.md`](./LEGAL_COMPLIANCE.md) — gate e documentos
