# Kit oficial Ananeri — web wiring (wave 1)

> **Inventário (referência):** Project store [`docs/ananeri-kit-oficial-inventory-2026-11-12.md`](../../../cursor/stores/bc-0a0af590-d3d8-48bf-a56e-a19021352d4a/docs/ananeri-kit-oficial-inventory-2026-11-12.md)  
> **Assets no repo:** `packages/web/public/brand/kit-oficial-ananeri/` (PR [#214](https://github.com/RafaDru/aiyra-care/pull/214))  
> **Guidelines:** `docs/brand/kit-oficial-ananeri/BRAND_GUIDELINES_FOR_AI.md`

| Campo | Valor |
|-------|--------|
| **ID** | `official-brand-kit-web-wave1` |
| **Tier** | 0 — assets + wiring UI (sem migração de theme tokens) |
| **Status** | `done` |
| **Depende** | PR #214 (kit no `public/`) |

## Objetivo

Apontar superfícies web user-facing para o **kit oficial** (lockups light/dark, símbolo, favicon, tile Neri na landing), mantendo expressões raster da Ava no dock/chat.

## Mapa de assets → superfície

| Superfície | Variante `AppLogo` / path | Arquivo kit (sob `kit-oficial-ananeri/`) | Altura default |
|------------|---------------------------|------------------------------------------|----------------|
| Landing hero, auth horizontal implícito | `horizontal` | `01-lockups-principais/ananeri-lockup-horizontal-{light\|dark}.svg` | 40–48px |
| Sidebar expandida | `sidebar` (= horizontal) | idem horizontal | 48px |
| Sidebar colapsada | `stacked` | `01-lockups-principais/ananeri-lockup-stacked-{light\|dark}.svg` | 44px |
| Header com sidebar colapsada | `wordmark` | `02-simbolo-e-wordmark/ananeri-wordmark-{light\|dark}.svg` | 36–38px |
| Auth / legal ícone | `square` | `02-simbolo-e-wordmark/ananeri-symbol-heart.svg` | 72–120px |
| Ícone genérico | `icon` | `ananeri-symbol-heart.svg` | 36px |
| Favicon | — | `04-app-icons-e-favicons/favicon.svg` (`index.html`) | — |
| OG default (`PageMeta`, `index.html`) | — | `06-social-e-splash/og-share-banner-1200x630.svg` | — |
| Tile Neri landing | constante em `landing.tsx` | `04-app-icons-e-favicons/neri-agent-tile-rounded.svg` | — |

**Dark mode:** `AppLogo` lê `ThemeProvider.darkMode` e escolhe sufixo `-light` ou `-dark` nos lockups/wordmark.

## Fora de escopo (wave 2)

- `ananeri-design-tokens.json` → CSS vars / Ant Design `ThemeProvider`
- Watermarks / fitas (`05-elementos-graficos-ui`)
- Export mobile (`packages/mobile/assets/brand/`)
- Rasterizar OG 1200×630 para PNG se redes exigirem bitmap
- Substituir `ava-expressions/*.png` por `neri-agent-avatar-circle.svg`
- Remover arquivos legados `logo-*` / `ananeri-*.svg` na raiz de `public/brand/` (permanecem no disco; UI não referencia)

## Implementação

| Arquivo | Mudança |
|---------|---------|
| `packages/web/src/components/brand/AppLogo.tsx` | Paths kit + variante `stacked` |
| `packages/web/src/components/layout/AppLayout.tsx` | Sidebar colapsada → `stacked` |
| `packages/web/src/pages/landing.tsx` | `NERI_TILE` kit |
| `packages/web/index.html` | Favicon + OG estáticos |
| `packages/web/src/components/seo/PageMeta.tsx` | Default `imagePath` OG banner |

**Inalterado (decisão Rafael):** `ava-expressions.ts`, PNGs Ava no dock/chat.

## QA

Tier 0 — build web + critical:

```powershell
cd packages/web && npm run build
npm run test:critical
```

Regressão visual opcional: [`auth-entry-flow`](../testing/suites/auth-entry-flow.md) no notebook.