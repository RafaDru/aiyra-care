# PWA beta — ícone light + shell mobile pós-login

| Campo | Valor |
|-------|--------|
| **ID** | `beta-pwa-mobile-shell` |
| **Tier** | 1 — UX beta Jenifer (AC-126) |
| **Status** | `done` |
| **Ver também** | [`docs/product/BETA_MOBILE_CHANNEL_PWA.md`](../product/BETA_MOBILE_CHANNEL_PWA.md), [`docs/MOBILE_WEB_DUAL_DELIVERY.md`](../MOBILE_WEB_DUAL_DELIVERY.md) |

## Objetivo

Canal PWA no preview GCP: ícone instalável **light** (kit §04) e navegação pós-login adequada a celular / `standalone`, sem alterar desktop largo.

## Escopo entregue

| Área | Comportamento |
|------|----------------|
| Ícones PWA | PNGs rasterizados de `app-icon-ios-android-light.svg` (192/512/apple-touch) |
| Manifest + HTML | `theme_color` / `background_color` `#FFF7FB` (silk light) |
| Shell compacto | `standalone` ou `≤768px` + coarse pointer → bottom nav; **Neri** centro → chat Ava; FAB **+** direita (Registro / Pedido); header lockup + gradiente; orb Ava oculto |
| Desktop | Sider + header inalterados |

## Implementação

| Arquivo | Papel |
|---------|--------|
| `packages/web/scripts/rasterize-brand-pwa-icons.mjs` | Fonte light para PNGs |
| `packages/web/public/manifest.webmanifest` | Cores + ícones |
| `packages/web/src/hooks/useCompactAppShell.ts` | Detecção viewport / standalone |
| `packages/web/src/components/layout/AppLayout.tsx` | Branch desktop vs compact |
| `packages/web/src/components/layout/AppMobileBottomNav.tsx` | 5 abas + Neri (rosto → chat) |
| `packages/web/src/components/layout/AppMobileCaptureFabStack.tsx` | FAB Registro + Pedido |
| `packages/web/src/components/layout/AppMobileServicesSheet.tsx` | Folha Serviços (compact) |
| `packages/web/src/styles/app-layout-mobile.css` | Contraste, header, bottom nav, oculta Ava |

## QA

Suite: [`docs/testing/suites/pwa-mobile-shell.md`](../testing/suites/pwa-mobile-shell.md) · regressão login: `auth-entry-flow`.

## Web-only (paridade mobile RN)

Shell Expo segue `packages/mobile`; esta entrega é **web/PWA** apenas (exceção documentada em dual delivery).