# Rebrand status — Ananeri

> **Atualizado:** 2026-11-06

| Campo | Valor |
|-------|--------|
| **Marca plataforma (UI)** | **Ananeri** |
| **Agente (chat/dock/FAB)** | **Neri** |
| **Paleta** | **Vivid v2 trilha B** (`#7E22CE`, `#EC4899`, `#FACC15`) |
| **Logo (UI)** | Placeholder **G2g metaball C** — lockup tipográfico não final |
| **Phase** | **1 — slices 1–5** (G3 web/API [#193](https://github.com/RafaDru/aiyra-care/pull/193), [#195](https://github.com/RafaDru/aiyra-care/pull/195); docs [#196](https://github.com/RafaDru/aiyra-care/pull/196)) |
| **INPI / ®** | **Adiado** — gate financeiro (ver Project store `ananeri-phase0-lock.md`) |
| **npm scope / repo** | **Phase 3A (code):** raiz npm `ananeri`, pacotes `@ananeri/*`. Nome do repositório GitHub / pasta local podem permanecer `aiyra-care` até passos manuais pós-merge. |
| **`LEGAL_*` env** | Placeholders beta inalterados até razão social/CNPJ definitivos |

## Slices (Phase 1)

| Slice | Escopo | Status |
|-------|--------|--------|
| 1 | `REBRAND_STATUS`, landing `/home`, footer, `index.html` SEO, tokens v2, logo G2g | **Concluído (G3)** |
| 2 | Agente UI (i18n `ava.*` → Neri, dock, layout) | **Concluído (G3)** |
| 3 | API mensagens user-facing + compliance seed display name | **Concluído** — `platform-display.ts`, auth/billing/e-mails/Neri LLM, seed legal titles, mobile shell copy; escopo npm migrado em Phase 3A |
| 4 | Docs produto / help face pública | **Concluído** — help, legal v1.0, features, hub `docs/README`, `PROJETO`, personas/jornadas; `@ananeri/*` / ids `ava_*` documentados |
| 5 | Ops / CH strings (docs) | **Concluído** — `AGENTS.md`, `docs/ops/*`, automations paste kits, notifier examples **Ananeri Ops** |

### Slice 3 — critério de done

- [x] Constantes `PLATFORM_DISPLAY_NAME` / `AGENT_DISPLAY_NAME` na API
- [x] Erros auth, Stripe/checkout, escalonamento sync, e-mails transacionais, guardrail/off-topic Neri
- [x] `seed-legal-documents.mjs` títulos **Ananeri** (conteúdo markdown legal = slice 4)
- [x] Mobile: `app.json` display name, i18n lock/onboarding, telas compliance/convite
- [x] Grep audit: sem `AiyraCare` / copy `Ava` user-facing em `packages/api/src` (exceto comentários técnicos / ids internos)
- [x] `npm run test:critical` + `compliance-gate` / `legal-publisher` no critical

### Slice 4 — critério de done

- [x] `docs/help/*`, `docs/legal/*/v1.0.md` e índices legais — marca **Ananeri**, agente **Neri** na copy
- [x] Feature cards + `docs/README.md`, `PROJETO.md`, personas/jornadas/produto alinhados
- [x] [`product-terminology.md`](../product-terminology.md) — convenção dev (`ava.*` / paths `AVA_*` vs display Neri)

### Slice 5 — critério de done

- [x] [`AGENTS.md`](../../AGENTS.md) — marca vs monorepo `@ananeri`
- [x] `docs/ops/*` (CH, notificador, runbooks) — prefixo **Ananeri Ops** onde aplicável
- [x] Instruções automations CH — referência **Ananeri** (identificadores `aiyra-*` de webhook inalterados)

## Assets (web)

| Arquivo | Uso |
|---------|-----|
| `packages/web/public/brand/ananeri-symbol.svg` | Ícone, OG placeholder |
| `packages/web/public/brand/ananeri-lockup.svg` | Header / sidebar |
| `packages/web/public/brand/ananeri-neri-tile.svg` | Tile dock Neri |
| `packages/web/public/brand/ananeri-favicon.svg` | Favicon |

## QA

- Cloud: `packages/web` build + `npm run test:critical`
- Notebook (footer/landing): suite [`auth-entry-flow`](../testing/suites/auth-entry-flow.md)
- Agente: suites lane `ava` se alteração de strings

## Identificadores legados (infra)

- **GCP preview (código / defaults):** serviços, Artifact Registry e jobs usam prefixo **`ananeri-preview-*`** (`infra/gcp/preview.defaults.json`). Recursos ainda chamados `aiyracare-preview-*` no console são legados até redeploy ou rename manual.
- **Postgres:** instâncias e databases (`aiyracare`, `aiyracare_preview`) **não** mudam só por causa do rename npm — migração de BD é passo separado.
- **Checklists:** org npm `@ananeri` e variáveis `LEGAL_*` — [`NPM_ORG_AND_LEGAL_ENV.md`](./NPM_ORG_AND_LEGAL_ENV.md).

## Referências

- Brand spec v2: Project store `docs/ananeri-brand-spec-v2.md`
- Plano execução: Project store `docs/ananeri-phase1-rebrand-plan.md`
- Beta sem domínio final: [`BETA_PREP_WITHOUT_BRAND_LOCK.md`](./BETA_PREP_WITHOUT_BRAND_LOCK.md)
