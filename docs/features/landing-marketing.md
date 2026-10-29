# Landing pública — marketing e funil

| Campo | Valor |
|-------|--------|
| **ID** | `landing-marketing` |
| **Épico** | `institutional-landing` · `landing-page-refresh` |
| **Status** | `in_progress` |
| **Categoria** | negócio |
| **Prioridade** | P2 |

## Resumo

Página pública `/home` com hero, dores da família, showcases de produto, bloco **Quem somos / LGPD**, planos sem preços vinculantes, footer institucional e CTAs para login/signup. Telemetria anônima `landing_page_view` / `landing_cta_click`.

## Go-live institucional (Wave MVP)

- Footer: Termos (`/termos`), Privacidade (`/privacidade`), Cookies (`/cookies`); razão social/CNPJ via `GET /compliance/contact` (mesmo publisher da API: `LEGAL_ENTITY_NAME`, `LEGAL_CNPJ`) com fallback opcional no build: `VITE_LEGAL_ENTITY_NAME`, `VITE_LEGAL_CNPJ`.
- SEO: `PageMeta` na landing + defaults em `index.html`; canonical/OG com `VITE_PUBLIC_SITE_URL` quando definido.
- Checklist: [`docs/product/MVP_GO_LIVE_CHECKLIST.md`](../product/MVP_GO_LIVE_CHECKLIST.md)

## Entrada auth (2026-09)

- CTAs **Entrar** / **Criar conta** navegam para `/login?mode=login|signup`
- Login com segmented «Já sou cliente» / «Sou novo cliente»
- Signup → onboarding guiado (não dashboard direto)

## QA

- Suite [`auth-entry-flow`](../testing/suites/auth-entry-flow.md) — landing → login/signup mode + dashboard «Sua família»; footer → termos/privacidade (documentos seed)
- Ritual beta Sessão B: [`BETA_PREP_WITHOUT_BRAND_LOCK.md`](../product/BETA_PREP_WITHOUT_BRAND_LOCK.md)
- Smoke: `regression-smoke` — `/home` render

## Roadmap

- **Feito:** rota pública, hero, mocks, screenshots, copy v2, tracking, footer institucional, SEO base, quem somos, pricing honesto
- **Planejado (`landing-page-refresh`):** animações, carrossel de dores, prova social
