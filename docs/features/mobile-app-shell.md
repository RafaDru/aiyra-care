# App mobile — shell Expo (paridade web)

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-app-shell` |
| **Épico** | `plat-mobile` |
| **Status** | `in_progress` |
| **Categoria** | técnico |
| **Prioridade** | P2 |

## Resumo

Estrutura **React Native + Expo** espelhando jornadas principais do web: auth Supabase (e-mail/senha + Google OAuth), lista de pacientes, perfil com macro-seções e tabs com conteúdo **read-only** onde o web ainda concentra CRUD/sync.

## Objetivo

Permitir evolução mobile **Cursor-only** sem duplicar lógica de backend; mesmo BFF FastAPI em `:3010`.

## Superfície técnica

| Camada | Referência |
|--------|------------|
| Package | `packages/mobile` (Expo Router) |
| Tokens | `packages/design-tokens` |
| Navegação paciente | Espelho de `packages/web/src/lib/patient-navigation.ts` |
| API / env | `packages/mobile/src/lib/api.ts`; `EXPO_PUBLIC_*` — ver `packages/mobile/README.md` |
| Auth | Supabase + AsyncStorage; OAuth Google → `src/lib/supabase-oauth.ts` |
| Plano | Project store `docs/mobile-parity-plan.md` |

## Conteúdo (paridade fila 2026-09)

| Tab | Mobile | Web-only |
|-----|--------|----------|
| **Carteira** | `PatientWalletTab` — CNS, convênios, link web | QR token, sync modal, copay detalhada |
| **Exames** | `PatientExamsTab` — lista resumo, pull-to-refresh | CRUD, marcadores, laudos PDF |
| **Integrações** | Status + link web | Login portal, `POST …/sync` |

## Marco M2 (login + início)

- Login **Entrar / Criar conta** (e-mail/senha + aceite legal no cadastro), logo `AppLogo`, Google OAuth
- Lista de pacientes via `GET /patients`, agrupada por faixa etária
- Loading, erro com retry e pull-to-refresh na aba Início

## Marco M4 (família + compliance)

- Hub **Família** (`/(app)/settings/family`), deep link `invite/accept`, gate compliance

## Marco M5 (Ava companion)

- FAB **`AvaGlobalDock`**, chat SSE, lente de paciente — ver `docs/AVA_OPERATIONAL.md`

## Marco M6 (integrações / sync — sem Playwright)

- **`PatientIntegrationsPanel`** — sem `POST …/sync` no mobile

## QA

| Escopo | Comando |
|--------|---------|
| **Smoke mobile (manual + estrutural)** | [`mobile-shell-smoke`](../../docs/testing/suites/mobile-shell-smoke.md) · `npm run qa:run:mobile` |
| Tipo + export web | `npm run mobile:check` |
| Tipo isolado | `cd packages/mobile && npm run typecheck` |
| API inalterada | Sem alteração de contrato nesta entrega |

**Passos resumidos:** login → lista → paciente → Plano/Carteira + Clínico/Exames → (opcional) Google OAuth.

## Pendente

- Tela de apresentação / onboarding visual (primeira navegação)
- Logomarca SVG no bundle nativo (hoje: wordmark no Expo Go; SVG via `EXPO_PUBLIC_WEB_APP_URL` no Expo web)
- Onboarding de perfil (web `/onboarding`) — mobile não bloqueia; mensagem na lista
- Demais tabs clínicas (medicamentos, vacinas, …) e Convênios UI completa
- Microsoft OAuth no mobile
- Suite Playwright mobile (CI)
