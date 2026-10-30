# Rebrand status — Ananeri

> **Atualizado:** 2026-10-30

| Campo | Valor |
|-------|--------|
| **Marca plataforma (UI)** | **Ananeri** |
| **Agente (chat/dock/FAB)** | **Neri** |
| **Phase** | **1 — em progresso** (slices 1–2 no repo) |
| **INPI / ®** | **Adiado** — gate financeiro (ver Project store `ananeri-phase0-lock.md`) |
| **npm scope / repo** | Sem rename — `@aiyra-care/*` e `aiyra-care` (Phase 3A defer) |
| **`LEGAL_*` env** | Placeholders beta inalterados até razão social/CNPJ definitivos |

## Slices (Phase 1)

| Slice | Escopo | Status |
|-------|--------|--------|
| 1 | `REBRAND_STATUS`, landing `/home`, footer, `index.html` SEO | Em progresso |
| 2 | Agente UI (i18n `ava.*`, dock, layout) | Em progresso |
| 3 | API mensagens user-facing + compliance seed display name | Pendente |
| 4 | Docs produto / help face pública | Pendente |
| 5 | Ops / CH strings | Pendente |

## QA

- Cloud: `packages/web` build + `npm run test:critical`
- Notebook (footer/landing): suite [`auth-entry-flow`](../testing/suites/auth-entry-flow.md)

## Referências

- Lock Phase 0: Project store `docs/ananeri-phase0-lock.md`
- Plano execução: Project store `docs/ananeri-phase1-rebrand-plan.md`
- Beta sem domínio final: [`BETA_PREP_WITHOUT_BRAND_LOCK.md`](./BETA_PREP_WITHOUT_BRAND_LOCK.md)
