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

**Plano em quatro blocos (sequência fixa):** transacional → gráficos → Ava → estética — ver [`MOBILE_EVOLUTION_BLOCKS.md`](../MOBILE_EVOLUTION_BLOCKS.md). Status atual: fim do shell **leitura**; **Bloco 1 (transacional)** é o próximo.

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
| **Exames** | `PatientExamsTab` — **CRUD manual** + pull-to-refresh, link web | Marcadores, laudos PDF/OCR |
| **Medicamentos** | `PatientMedicationsTab` — **CRUD** + em uso/encerrado | Administração, lembretes |
| **Vacinas** | `PatientVaccinesTab` — **CRUD** + pull-to-refresh, link web | Calendário PNI, ConecteSUS, OCR carteira |
| **Alergias** | `PatientAllergiesTab` — **CRUD** + pull-to-refresh | — |
| **Atendimentos** | `PatientMedicalRecordsTab` — **CRUD** + link web (sequência) | Encadeamento Neo4j / vínculos avançados |
| **Autorizações** | `PatientAuthorizationsTab` — lista read-only | PDF, sequência |
| **Diagnósticos** | `PatientDiagnosesTab` — **CRUD** + pull-to-refresh | Busca CID avançada (web) |
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
| **Bloco 1 — alergias CRUD** | [`mobile-allergies-crud`](../../docs/testing/suites/mobile-allergies-crud.md) · `npm run qa:run -- --suite mobile-allergies-crud` |
| **Bloco 1 — atendimentos CRUD** | [`mobile-medical-records-crud`](../../docs/testing/suites/mobile-medical-records-crud.md) · `npm run qa:run -- --suite mobile-medical-records-crud` |
| **Bloco 1 — medicamentos CRUD** | [`mobile-medications-crud`](../../docs/testing/suites/mobile-medications-crud.md) · `npm run qa:run -- --suite mobile-medications-crud` |
| **Bloco 1 — vacinas CRUD** | [`mobile-vaccines-crud`](../../docs/testing/suites/mobile-vaccines-crud.md) · `npm run qa:run -- --suite mobile-vaccines-crud` |
| **Bloco 1 — exames CRUD** | [`mobile-exams-crud`](../../docs/testing/suites/mobile-exams-crud.md) · `npm run qa:run -- --suite mobile-exams-crud` |
| **Bloco 1 — agenda transacional** | [`mobile-agenda-crud`](../../docs/testing/suites/mobile-agenda-crud.md) · `npm run qa:run -- --suite mobile-agenda-crud` |
| **Bloco 1 — diagnósticos CRUD** | [`mobile-diagnoses-crud`](../../docs/testing/suites/mobile-diagnoses-crud.md) · `npm run qa:run -- --suite mobile-diagnoses-crud` |
| Tipo + export web | `npm run mobile:check` |
| Tipo isolado | `cd packages/mobile && npm run typecheck` |
| API inalterada | Sem alteração de contrato nesta entrega |

**Passos resumidos:** login → lista → paciente → Plano/Carteira + Clínico/Exames/Medicamentos/Vacinas → (opcional) Google OAuth.

## Telemetria (paridade web)

- `POST /telemetry/client-errors` com JWT — `packages/mobile/src/lib/client-errors.ts` (API/network, `ui_boundary`, auth pós-login)
- `AppErrorBoundary` + toast em falhas 5xx/rede (`service-failure-notify.ts`)
- Command Hub → Produto → Mobile — feature `mobile_shell` / `settings`

## Pendente

- Telemetria ops em falhas de auth **sem JWT** (cadastro aguardando e-mail)
- Onboarding mobile — passos 1–2 (titular + dependentes) em `/(app)/onboarding`, paridade com web
- **Agenda** — CRUD eventos (consulta/lembrete/tarefa) em `PatientAgendaTab`; calendário/ICS/sync no web
- Demais tabs clínicas (autorizações, diagnósticos, crescimento, …) e Convênios UI completa
- Microsoft OAuth no mobile
- Suite Playwright mobile (CI)
