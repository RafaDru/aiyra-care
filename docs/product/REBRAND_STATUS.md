# Rebrand status — Ananeri

> **Atualizado:** 2026-11-01

| Campo | Valor |
|-------|--------|
| **Marca plataforma (UI)** | **Ananeri** |
| **Agente (chat/dock/FAB)** | **Neri** |
| **Paleta** | **Vivid v2 trilha B** (`#7E22CE`, `#EC4899`, `#FACC15`) |
| **Logo (UI)** | Placeholder **G2g metaball C** — lockup tipográfico não final |
| **Phase** | **1 — slices 1–2** (G3 em PR [#193](https://github.com/RafaDru/aiyra-care/pull/193)) |
| **INPI / ®** | **Adiado** — gate financeiro (ver Project store `ananeri-phase0-lock.md`) |
| **npm scope / repo** | Sem rename — `@aiyra-care/*` e `aiyra-care` (Phase 3A defer) |
| **`LEGAL_*` env** | Placeholders beta inalterados até razão social/CNPJ definitivos |

## Slices (Phase 1)

| Slice | Escopo | Status |
|-------|--------|--------|
| 1 | `REBRAND_STATUS`, landing `/home`, footer, `index.html` SEO, tokens v2, logo G2g | **Concluído (G3)** |
| 2 | Agente UI (i18n `ava.*` → Neri, dock, layout) | **Concluído (G3)** |
| 3 | API mensagens user-facing + compliance seed display name | Pendente |
| 4 | Docs produto / help face pública | Pendente |
| 5 | Ops / CH strings | Pendente |

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

## Referências

- Brand spec v2: Project store `docs/ananeri-brand-spec-v2.md`
- Plano execução: Project store `docs/ananeri-phase1-rebrand-plan.md`
- Beta sem domínio final: [`BETA_PREP_WITHOUT_BRAND_LOCK.md`](./BETA_PREP_WITHOUT_BRAND_LOCK.md)
