# PWA beta — ícone light + shell mobile pós-login

| Campo | Valor |
|-------|--------|
| **ID** | `beta-pwa-mobile-shell` |
| **Tier** | 1 — UX beta Jenifer (AC-126) |
| **Status** | `in_progress` |
| **Ver também** | [`docs/product/BETA_MOBILE_CHANNEL_PWA.md`](../product/BETA_MOBILE_CHANNEL_PWA.md), [`docs/MOBILE_WEB_DUAL_DELIVERY.md`](../MOBILE_WEB_DUAL_DELIVERY.md) |

## Objetivo

Canal PWA no preview GCP: ícone instalável **light** (kit §04) e navegação pós-login adequada a celular / `standalone`, sem alterar desktop largo.

## Escopo entregue

| Área | Comportamento |
|------|----------------|
| Ícones PWA | Tile light 192/512/maskable; **splash/apple-touch** = lockup stacked em silk (`pwa-startup-lockup-light.svg`) |
| Manifest + HTML | `theme_color` / `background_color` `#FFF7FB` (silk light) |
| Shell compacto | Bottom nav **50px** + overhang 22px; **Neri** → chat 100vw; FAB direita; HDR-2; NAV-CONTENT; **PAT-CTX-2** parallax (coração 56px + chip no header no perfil; nav ícones off ao rolar fundo) |
| Paciente compact | PAT-2b sub-abas; macro PAT-2a; PAT-CTX-2 chrome; seleção fidel; copy onboarding home vazia |
| Dia a dia | `patient-list-bus` + refresh da lente Ava após CRUD; card discovery **dark legível** (P0-8, `day-to-day-discovery-hub.css`) |
| Loading | `CenteredPageLoading` / `CenteredBlockLoading` |
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
| `packages/web/src/lib/patient-list-bus.ts` | Sincroniza lista após cadastro |
| `packages/web/src/components/patient/PatientCompactSubTabs.tsx` | Sub-abas mobile (alternativa ao carrossel Ant Tabs) |
| `packages/web/src/components/patient/PatientCompactMacroSections.tsx` | Macro 2×2 no compact (PAT-1 / P0-7) |
| `packages/web/src/components/patient/PatientCompactPersonContextBar.tsx` | Barra contexto pessoa ao rolar (PAT-CTX-1) |
| `packages/web/src/components/ui/CenteredLoading.tsx` | Spinner centralizado |

## QA

| Suíte | Comando |
|-------|---------|
| Shell | [`pwa-mobile-shell`](../testing/suites/pwa-mobile-shell.md) |
| UX paciente (2026-11-23) | [`pwa-mobile-patient-ux`](../testing/suites/pwa-mobile-patient-ux.md) · `npm run qa:run -- --suite pwa-mobile-patient-ux` |
| Login | `auth-entry-flow` |

## Web-only (paridade mobile RN)

Shell Expo segue `packages/mobile`; esta entrega é **web/PWA** apenas (exceção documentada em dual delivery).