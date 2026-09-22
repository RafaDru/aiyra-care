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

## Entrega dual (80/20)

Toda capacidade de produto tier ≥ 1 deve considerar **web + mobile** na mesma entrega, salvo exceções documentadas — ver [`MOBILE_WEB_DUAL_DELIVERY.md`](../MOBILE_WEB_DUAL_DELIVERY.md).

## Superfície técnica

| Camada | Referência |
|--------|------------|
| Package | `packages/mobile` (Expo Router) |
| Tokens | `packages/design-tokens` |
| Navegação paciente | Espelho de `packages/web/src/lib/patient-navigation.ts` |
| API / env | `packages/mobile/src/lib/api.ts`; `EXPO_PUBLIC_*` — ver `packages/mobile/README.md` |
| Auth | Supabase + AsyncStorage; OAuth Google → `src/lib/supabase-oauth.ts` |
| Ops | Command Hub → contexto **Produto** → aba **Mobile** (`docs/ops/CONSOLE.md`) |
| Plano | Project store `docs/mobile-parity-plan.md` |

## Conteúdo (paridade fila 2026-09)

| Tab | Mobile | Web-only |
|-----|--------|----------|
| **Carteira** | `PatientWalletTab` — CNS, convênios, link web | QR token, sync modal, copay detalhada |
| **Convênios** | `PatientCoverageTab` — planos/carteirinha read-only + link web | Vincular plano, cartão virtual |
| **Exames** | `PatientExamsTab` — lista resumo, pull-to-refresh | CRUD, marcadores, laudos PDF |
| **Medicamentos** | `PatientMedicationsTab` — lista resumo (ativo/encerrado), pull-to-refresh, link web | CRUD, administração, lembretes |
| **Vacinas** | `PatientVaccinesTab` — doses aplicadas, pull-to-refresh, link web | Calendário PNI, ConecteSUS, OCR carteira |
| **Integrações** | Status + link web | Login portal, `POST …/sync` |

## Marco M2 (login + início)

- Tela **`(auth)/welcome`** — apresentação + Entrar / Criar conta
- Login **Entrar / Criar conta** (e-mail/senha + aceite legal no cadastro), logo `AppLogo` (variante **square**, paridade `AuthPageLayout` web), Google OAuth
- **i18n** — `packages/mobile/src/i18n` (`pt-BR` / `en`, chave `aiyra-care-lang` igual ao web); idioma em Configurações
- **Toast** — `ToastProvider` + `useToast()` para feedback padronizado (auth e fluxos futuros)
- **Manter conectado** — mesma chave `aiyra-care-remember-me` do web; sessão Supabase em memória se desligado (perde ao fechar o app)
- **Biometria** — `expo-local-authentication`; tela `/(auth)/unlock`; re-lock ao ir para background; toggle no login e em Configurações
- **Logo PNG** — `npm run brand:sync-png` (mobile) rasteriza SVG do web com **Inter 600** (`@expo-google-fonts/inter`); rodar após mudar `packages/web/public/brand/*.svg`
- **Rotas de paciente** — URL usa ref opaca `p_*` (mapa em memória no app); API continua com UUID. **Roadmap:** refs de sessão no BFF (estilo «handle» por login) para não expor IDs em tráfego de cliente — padrão comum em fintech; não substitui autorização no servidor.
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

**Passos resumidos:** login → lista → paciente → Plano/Carteira + Clínico/Exames/Medicamentos/Vacinas → (opcional) Google OAuth.

## Pendente

- Telemetria ops em falhas de auth **sem JWT** (cadastro aguardando e-mail) — ver `client-errors.ts`
- Onboarding mobile — passos 1–2 (titular + dependentes) em `/(app)/onboarding`, paridade com web
- **Agenda** — lista read-only com ícones por tipo + link web (`PatientAgendaTab`)
- Demais tabs clínicas (alergias, atendimentos, …) e Convênios UI completa
- Microsoft OAuth no mobile
- Suite Playwright mobile (CI)
