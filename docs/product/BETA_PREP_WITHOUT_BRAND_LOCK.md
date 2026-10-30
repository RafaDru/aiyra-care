# Beta prep — Sessão B (sem lock de marca)

> **2026-10-29** — Trilha MVP negócio/dev. Rebrand/domínio final ficam na **Sessão A** (Project store: `docs/session-split-rebrand-vs-produto.md`).

Objetivo: fechar **pilares 1–2 e 5 (eng)** do [`MVP_GO_LIVE_CHECKLIST.md`](./MVP_GO_LIVE_CHECKLIST.md) **sem** domínio `.com.br`, CNPJ definitivo ou wordmark final.

## O que pode avançar agora

| Pilar | Entregas agente | Bloqueio humano |
|-------|-----------------|-----------------|
| **1** Institucional | `/home`, footer → `/termos` `/privacidade` `/cookies`, SEO com `VITE_PUBLIC_SITE_URL` **opcional** (preview URL) | Copy tier 1.3, preços 1.9 |
| **2** Anel A + J1 | Gate eng ([#177](https://github.com/RafaDru/aiyra-care/pull/177)); suites J1 verdes no notebook | — |
| **3** Legal prep | Seed documentos, `LEGAL_*` **placeholder**, `COMPLIANCE_GATE_ENABLED` em beta | CNPJ, mapa LGPD, advogado |
| **4** Domínio | — | **Pausado** até lock marca (AC-28) |
| **5** Deploy beta | `promotion:gates`, preview GCP, `preview:post-deploy`, scrape prod [#178](https://github.com/RafaDru/aiyra-care/pull/178) | Lista testers / Rafael beta público |

## Ritual notebook (Definition of Done tier ≥1)

Ordem recomendada após `git pull` + migrations:

```bash
# 1) Stack local
# Windows: scripts/up.ps1 — ver AGENTS.md

# 2) Documentos legais no PG (obrigatório antes de E2E legal / compliance)
npm run beta:bootstrap-legal

# 3) Conta QA (cliente existente + onboarding)
npm run qa:create-test-user
npm run qa:seed-e2e-account
npm run qa:create-onboarding-user

# 4) J1 — entrada + onboarding
npm run qa:run -- --suite auth-entry-flow
npm run qa:run -- --suite onboarding-flow
npm run qa:run -- --suite core-patient-crud
npm run qa:run -- --suite dashboard-people-grouping

# 5) Regressão (pré-preview)
npm run qa:run-all -- --lane regression
```

Cloud Agent: build + `test:e2e:ci` quando PG/Supabase disponíveis; **DoD** permanece notebook com `QA_TEST_*`.

**Dispatch do coordenador Cloud:** `Task`/`selfHostedWorkerId` **não** roteia para My Machines — ver [`../ops/NOTEBOOK_QA_DISPATCH.md`](../ops/NOTEBOOK_QA_DISPATCH.md) (REST `env.machine`, CreateAgent `worker_id`, ou chat My Machines).

---

## Estado (pós-merge main)

| Data | Entrega |
|------|---------|
| 2026-10-30 | [#189](https://github.com/RafaDru/aiyra-care/pull/189) Anel B slice 3 · [#190](https://github.com/RafaDru/aiyra-care/pull/190) ritual beta + E2E footer legal |
| CI | `e2e-regression` verde (incl. `auth-entry-flow.spec.ts`) |
| Cloud `promotion:gates` | ✅ com skips esperados sem `DATABASE_URL` / staging local |

## Próximo — Preview (Ambiente 2)

1. Notebook: `scripts/up.ps1` → `beta:bootstrap-legal` → suites J1 (passo 4 acima) → `promotion:gates` **sem** skips de DB.
2. Local preview: [`OPS_PREP_CHECKLIST.md`](../infra/OPS_PREP_CHECKLIST.md) §5 — `up:preview`, `preview:validate`.
3. GCP: [`GCP_PREVIEW_RUNBOOK.md`](../infra/GCP_PREVIEW_RUNBOOK.md) — secrets Environment `preview`, `promote-preview.yml`, `preview:post-deploy`.
4. **AC-23:** no host beta/preview com `DEPLOYMENT_TIER=production`, validar gate scrape [#178](https://github.com/RafaDru/aiyra-care/pull/178).

Aprovação Rafael em `promotion-report-last.md` antes de promover preview GCP (charter).

## Variáveis beta (placeholder marca)

API (`.env`) — valores de **prep**, não go-live público:

```env
LEGAL_ENTITY_NAME=AiyraCare (beta — razão social a confirmar)
# LEGAL_CNPJ=              # 14 dígitos — só após contador/advogado
LEGAL_PRIVACY_EMAIL=privacidade@exemplo.com
LEGAL_SUPPORT_EMAIL=suporte@exemplo.com
COMPLIANCE_GATE_ENABLED=1   # beta fechado; staging pode usar 0
DEPLOYMENT_TIER=preview     # ou production no GCP para validar scrape gate #178
API_PUBLIC_URL=https://…    # URL preview Cloud Run — não domínio final
```

Web (opcional fallback footer/SEO):

```env
VITE_PUBLIC_SITE_URL=https://…preview…
VITE_LEGAL_ENTITY_NAME=AiyraCare (beta)
```

## Evitar até Sessão A (rebrand)

- Rename massivo user-facing, `TRANSACTIONAL_EMAIL_FROM` no domínio final, OAuth callbacks no domínio `.com.br`.

## Referências

- Checklist completo: [`MVP_GO_LIVE_CHECKLIST.md`](./MVP_GO_LIVE_CHECKLIST.md)
- Jornadas J1: [`USABILITY_JOURNEYS.md`](./USABILITY_JOURNEYS.md)
- Deploy: [`../infra/DEPLOY_BETA_RUNBOOK.md`](../infra/DEPLOY_BETA_RUNBOOK.md)
- Landing card: [`../features/landing-marketing.md`](../features/landing-marketing.md)
- Suite entrada: [`../testing/suites/auth-entry-flow.md`](../testing/suites/auth-entry-flow.md)
