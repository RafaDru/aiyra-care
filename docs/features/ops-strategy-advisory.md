# Estratégia advisory (console ops)

| Campo | Valor |
|-------|--------|
| **ID** | `ops-strategy-advisory` |
| **Épico** | `business-analytics` / Command Hub |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P2 |

## Resumo

Aba **Estratégia** no Command Hub (`packages/ops-console`) para leitura interna de relatórios round 1 (Marketing, Financeiro, CX) sem PHI — alinhado a advisors do Project store.

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Console | `StrategyPanel.tsx`, `?tab=strategy&strategy=mkt\|finance\|cx` |
| Conteúdo | `packages/ops-console/content/strategy/` + `manifest.json` |
| API | `GET /api/strategy/manifest`, `GET /api/strategy/content/:section` |

## CX

- Primário: `experience-cx-round1.md`
- Secundário (collapse): `experience-simulation-round2-plan.md`
- Callout ops: severidades **S1** (Hoje sem lente) e **S2** (pilha compliance/tour/onboarding)

## Guardrails

- Somente markdown estático interno; não expõe dados de titulares.
- Skills advisor referenciadas no rodapé (Project store); não substituem `aiyracare-feature-release`.

## QA

- `cd packages/ops-console && npm run build`
- `npm run test:ops` (regressão API ops; esta feature é UI-only no console)

## Relacionado

- [`business-analytics-ops.md`](./business-analytics-ops.md) — KPIs aba Negócio
- Roadmap: épico run / `run-ops-console-sections` (Command Hub F2 — leitura estratégica)
