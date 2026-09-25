# App mobile — shell Expo (paridade web)

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-app-shell` |
| **Épico** | `plat-mobile` |
| **Status** | `in_progress` |
| **Categoria** | técnico |
| **Prioridade** | P2 |

## Resumo

Estrutura **React Native + Expo** espelhando jornadas principais do web: auth Supabase, lista de pacientes, perfil com macro-seções (overview / clinical / plan / files) e tabs **Carteira** (dados API read-only), **Convênios**, **Integrações**, **Exames** com placeholders onde a UI web ainda não foi portada.

## Objetivo

Permitir evolução mobile **Cursor-only** sem duplicar lógica de backend; mesmo BFF FastAPI em `:3010`.

## Superfície técnica

| Camada | Referência |
|--------|------------|
| Package | `packages/mobile` (Expo Router) |
| Tokens | `packages/design-tokens` (`@aiyra-care/design-tokens`) |
| Navegação paciente | Espelho de `packages/web/src/lib/patient-navigation.ts` |
| API / env | `packages/mobile/src/lib/api.ts`; `EXPO_PUBLIC_API_URL` (default `:3010`) — ver `.env.example` |
| Auth | `EXPO_PUBLIC_SUPABASE_*` + AsyncStorage — ver `packages/mobile/.env.example` |
| Plano | Project store `docs/mobile-parity-plan.md` |

## QA (M1–M3)

Estrutural — smoke manual: login → lista → abrir paciente → tab Carteira. Suite automatizada: **pendente** (`mobile-shell-smoke`).

**Env local:** copiar `packages/mobile/.env.example` → `.env` (não commitar).

## Marco M2 (login + início)

- `.env.example` com `EXPO_PUBLIC_SUPABASE_*` e `EXPO_PUBLIC_API_URL`
- Lista de pacientes via `GET /patients`, agrupada por faixa etária (espelho dashboard web)
- Loading, erro com retry e pull-to-refresh na aba Início

## Marco M3 (tokens compartilhados)

- Web importa `@aiyra-care/design-tokens` via `packages/web/src/theme/aiyracare-tokens.ts` (re-export + `SIDEBAR_SURFACE` / `AI_INSIGHT_STYLE` web-only)
- Ant Design `ThemeProvider` inalterado na forma — mapeamento continua em `ThemeProvider.tsx`

## Marco M4 (família + compliance)

- Hub **Família e cuidadores** (`/(app)/settings/family`) — círculos, convites e profile-shares via mesmas rotas do web (`/family-access/*`, `/care-circles`).
- Deep link **`invite/accept`** (`aiyracare://invite/accept?token=…`) com login prévio.
- Gate **`RequireComplianceGate`** + tela `/(app)/compliance/accept` (`GET/POST /compliance/*`).

## Marco M5 (Ava companion)

- FAB global **`AvaGlobalDock`** no shell autenticado (paridade `AvaGlobalDock` web).
- Chat com **SSE de atividade** (`POST /patients/:id/ava/chat`, `streamActivity: true`) via `ava-chat-stream.ts`.
- **Lente de paciente**: rota do perfil → último usado (AsyncStorage) → self → primeiro (`useAvaPatientLens`).
- API client: `api.ava.*`, `api.llm.quota`; bus interno `requestAvaOpen` para aceleradores futuros.
- Referência operacional: `docs/AVA_OPERATIONAL.md` (G1 lente + G4 activity trace).

## Marco M6 (integrações / sync — sem Playwright)

- Aba **Integrações** do paciente: lista `GET /integration-links`, status via polling `GET /integration-links/:id/sync-status` (`useIntegrationLinkSyncStatus`).
- **Sem** `POST /integration-links/:id/sync` no mobile — login browser e scrapers só no web.
- CTAs **Abrir integrações / Carteira no navegador** (`EXPO_PUBLIC_WEB_APP_URL`, deep link `?section=plan&tab=integrations|wallet`).

## Paridade conteúdo — Carteira (read-only)

- Aba **Carteira** (`PatientWalletTab`): `GET /patients/:id`, `GET /plan-memberships`, `GET /integration-links` — cartões SUS + convênios espelhando `WalletCardsTab` (sem modal QR/sync).
- Helpers: `wallet-format.ts`, `WalletCardFace.tsx`.
- Link discreto para funcionalidades completas no web.

## QA

| Escopo | Comando |
|--------|---------|
| Tipo mobile | `cd packages/mobile && npm run typecheck` |
| Export web smoke | `cd packages/mobile && npx expo export --platform web` |
| Carteira read-only | Smoke manual: paciente → Plano → Carteira → ver cartões ou empty state |
| M5 Ava | Smoke manual: login → FAB Ava → trocar lente → enviar pergunta (API local) |
| M6 Integrações | Smoke manual: paciente → Plano → Integrações → ver status → link web |
| API inalterada | Sem suite web nova — smoke estrutural mobile |

## Pendente

- Onboarding mobile
- Aceleradores «Pergunte à Ava» em entidades (pins G1)
- Ações G3 com confirmação no mobile
- Port de tabs clínicas (ExamsTab, WalletTodayPanel, QR token)
- OAuth Google deep links
