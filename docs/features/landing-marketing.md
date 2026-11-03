# Landing pública — marketing e funil

| Campo | Valor |
|-------|--------|
| **ID** | `landing-marketing` |
| **Épico** | `institutional-landing` · `landing-page-refresh` |
| **Status** | `in_progress` |
| **Categoria** | negócio |
| **Prioridade** | P2 |

## Resumo

Página pública `/home` **v2 Ananeri** (mobile-first): hero com lockup, prova de conceito (convênio + SUS + família), bloco **Conheça a Neri**, **Como funciona** (3 passos Anel A), **Privacidade/LGPD**, footer institucional e CTAs para login/signup. Telemetria anônima `landing_page_view` / `landing_cta_click`. Sem tabela de preços vinculante na página.

## Go-live institucional (Wave MVP)

- Footer: Termos (`/termos`), Privacidade (`/privacidade`), Cookies (`/cookies`); razão social/CNPJ via `GET /compliance/contact` (mesmo publisher da API: `LEGAL_ENTITY_NAME`, `LEGAL_CNPJ`) com fallback opcional no build: `VITE_LEGAL_ENTITY_NAME`, `VITE_LEGAL_CNPJ`.
- SEO: `PageMeta` — title `Ananeri — saúde integrada da família`; description com Neri + integração; canonical/OG com `VITE_PUBLIC_SITE_URL` quando definido.
- Checklist: [`docs/product/MVP_GO_LIVE_CHECKLIST.md`](../product/MVP_GO_LIVE_CHECKLIST.md)

## Entrada auth (2026-09)

- CTAs **Entrar** / **Criar conta** navegam para `/login?mode=login|signup`
- Login com segmented «Já sou cliente» / «Sou novo cliente»
- Signup → onboarding guiado (não dashboard direto)

## QA

- Suite [`auth-entry-flow`](../testing/suites/auth-entry-flow.md) — landing → login/signup mode + dashboard «Sua família»; footer → termos/privacidade (`data-testid` `landing-footer-link-terms` preservado)
- Build gate (Cloud): `cd packages/web && npm run build`
- Rebrand: copy **Ananeri** / **Neri**, assets `public/brand/ananeri-*` — [`REBRAND_STATUS.md`](../product/REBRAND_STATUS.md)
- Ritual beta Sessão B: [`BETA_PREP_WITHOUT_BRAND_LOCK.md`](../product/BETA_PREP_WITHOUT_BRAND_LOCK.md)
- Smoke: `regression-smoke` — `/home` render

## Roadmap

- **Feito (v2 W6):** arquitetura §3 business plan — hero, prova conceito, Neri, como funciona, privacidade, footer; SEO v2; remoção de showcases/galeria/pricing na página
- **Planejado (`landing-page-refresh`):** animações hero, carrossel de dores (opcional), prova social com métricas reais

## Revisões (tier 2)

- **Medical:** copy Neri — parceira, sem diagnóstico / substituição médica (disclaimers em hero + seção Neri)
- **Legal:** LGPD, links termos/privacidade, marcas terceiros ilustrativas (disclaimer integrações)
