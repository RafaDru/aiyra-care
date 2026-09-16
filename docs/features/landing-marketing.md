# Landing pública — marketing e funil

| Campo | Valor |
|-------|--------|
| **ID** | `landing-marketing` |
| **Épico** | `institutional-landing` · `landing-page-refresh` |
| **Status** | `in_progress` |
| **Categoria** | negócio |
| **Prioridade** | P2 |

## Resumo

Página pública `/home` com hero, dores da família, showcases de produto, planos placeholder e CTAs para login/signup. Telemetria anônima `landing_page_view` / `landing_cta_click`.

## Entrada auth (2026-09)

- CTAs **Entrar** / **Criar conta** navegam para `/login?mode=login|signup`
- Login com segmented «Já sou cliente» / «Sou novo cliente»
- Signup → onboarding guiado (não dashboard direto)

## QA

- Suite [`auth-entry-flow`](../testing/suites/auth-entry-flow.md) — landing → login/signup mode + dashboard «Sua família»
- Smoke: `regression-smoke` — `/home` render

## Roadmap

- **Feito:** rota pública, hero, mocks, screenshots, copy v2, tracking
- **Planejado (`landing-page-refresh`):** animações, carrossel de dores, prova social
