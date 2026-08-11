# Open Health - Documento Vivo do Projeto

> **Última atualização:** 2026-08-06  
> **Status:** Sync Unimed BH + **Amil validado**; P0 Connect — silent sync na Carteira, incremental Unimed/Amil, hardening sessão/browser (2026-08-11)  
> **Repositório:** https://github.com/RafaDru/open-health

---

## Missão
Centralizar o histórico médico das crianças em um único ecossistema,
acessível para consultas, relatórios e compartilhamento com profissionais de saúde.

## Crianças

| Nome | Nascimento | Peso | Alergias | Condições |
|------|-----------|------|----------|----------------|
| Luís Drummond Freitas Reis | 23/01/2020 | 20kg | TBD | TBD |
| Bruno Drummond Freitas Reis | 26/10/2022 | 14kg | TBD | TBD |

---

## Como a plataforma opera agora (guia para continuidade)

### Fluxo do usuário

1. **Dashboard** (`/`) — cards por faixa etária; clique abre perfil do paciente.
2. **Perfil** (`/patients/:id`) — abas clínicas + **Carteira** (3 sub-abas):
   - **Carteirinhas** (`WalletCardsTab`) — cards por operadora; sync silencioso automático; novelty no toolbar.
   - **Convênios** (`CoverageTab`) — planos, carências, cobertura; linhas com tint por operadora.
   - **Integrações** (`IntegrationsTab`) — vínculos, Sincronizar manual, dock SSE + histórico.
   - Vincular operadora (Unimed / Amil / Bradesco / Mater Dei / Hermes) com CPF ou e-mail + senha do portal.
   - **Sincronizar** — dispara job assíncrono; `SyncProgressModal` faz polling (Steps: login → buscar dados → salvar → concluído).
   - **Meu plano** — dados de `plan_memberships` + `insurance_plans` (nome, ANS, rede, carências).
   - **QR / token Unimed** — botão na carteira chama `POST .../virtual-card` (sessão Playwright dedicada).
3. **Integrações** (`/integrations`) — cards por portal; import legado via `ImportInsuranceModal` (agente LLM, não é o sync principal).

### Vínculo (`IntegrationLink`)

- Uma linha por `(patient_id, portal_type)` — UNIQUE no banco.
- `email` — login do portal: e-mail Unimed; **CPF** (só dígitos) Amil/Bradesco.
- `encrypted_password` — AES-256-GCM (`CRYPTO_KEY` no `.env`).
- `encrypted_session_token` + `session_expires_at` — JWT `userToken` Amil após login bem-sucedido (migration 010).
- `card_number` — carteirinha quando conhecida (preenchida no sync).
- Controller: `integration-link.controller.ts` — lock por `patientId:portal`, decrypt no sync, dedup na importação.

### Sync Unimed BH (detalhe)

```
POST /integration-links/:id/sync?silent=1|force=1  →  jobId
PortalSyncOrchestrator.runUnimedSync → UnimedBhSyncScraper.scrape(..., { extratoMonths, authorizationSince })
```

**Incremental (silent, sem force):** `sync-delta.helper.ts` — 2 meses de extrato; detalhe de autorização só desde `lastSyncAt − 14d`. Manual: 6 meses + detalhe full.

1. **Login** — `acquireUnimedBhSession()`; probe no extrato se sessão salva; fail-fast SSO.
2. **Cartão Virtual** (antes das APIs longas) — scrape in-page → `planCard` + upsert plano.
3. **Extrato** — intercept API `DataActionListarExtratoUtilizacao` → `MedicalRecord` (consultas, copart, nota fiscal).
4. **Autorizações** — `DataActionListarSolicCliente` + para cada pedido: detalhe, procedimentos, prestador, histórico → `Authorization` + `AuthorizationItem`.
5. **Upsert** — por `solicitation_number`; vínculo consulta↔autorização quando possível.
6. **Progresso** — steps: `login`, `fetch-extrato`, `fetch-autorizacoes`, `importing`, `done`.
7. **Resultado** — contagens + `authorizationDetails[]` no modal.

Arquivos: `unimedbh-sync.scraper.ts`, `unimedbh-login.helper.ts`, `unimedbh-cartao-virtual.scraper.ts`.

### Sync Amil (detalhe)

> **✅ Validado (2026-07-28):** sync end-to-end funcional — login via CDP Chrome real, importação de plano/carências/carteirinha e guias/tokens → `Authorization`. Syncs seguintes silenciosos com token salvo.

```
POST /integration-links/:id/sync?silent=1  →  jobId (incremental guias)
runAmilSync → AmilSyncScraper.scrape(..., { sessionToken, guidesPeriodStart, interactiveLogin })
```

**Incremental (silent):** `PostTokens` com `PeriodoIni` desde `lastSync−14d` (ou 2 meses). Manual: 12 meses.

**Autenticação (ordem de prioridade — evita Playwright/WAF):**

| # | Método | Quando | Browser visível? |
|---|--------|--------|------------------|
| 1 | Token salvo em `integration_links` | JWT ainda válido | Não — só HTTP |
| 2 | API `AuthOGS/Login` | Sem JWT válido | Não |
| 3 | CDP Chrome real | Sync **manual** após API falhar; silent **não** lê CDP antes | Chrome real |
| 4 | Playwright | Só se `AMIL_ALLOW_BROWSER=1` | Sim — WAF costuma 403 |

**APIs Amil** (Bearer `userToken`):

- `GET .../Beneficiario/Logado`
- `GET .../Beneficiario/{marca}/ListaBeneficiarios`
- `GET .../Beneficiario/{marca}/Plano`, `GET .../Carencia/{marca}`
- `POST .../GuiasTokens/{marca}/PostTokens` → autorizações

**Gotchas Amil:**

- Login: `POST /beneficiario/api/AuthOGS/Login` — body `{ userData: { login: cpfDigits, senha, idSistema: 400 } }`.
- Formulário React/redux-form: `fill()` não preenche senha — usar native value setter (`setReactInputValue`).
- JWT: carteirinha em `objeto.login`, não `marcaOtica`.
- WAF bloqueia POST automatizado de Playwright (403) — preferir token/CDP.

Arquivo principal: `packages/api/src/infrastructure/scraper/amil-sync.scraper.ts`.

### Domínio plano (`InsurancePlan` + `PlanMembership`)

- `InsurancePlanService.upsertFromPortal(patientId, PortalPlanSnapshot, integrationLinkId)`.
- `PortalPlanSnapshot.waitingPeriods` → JSONB `waiting_periods` no plano.
- Unimed: dados do Cartão Virtual; Amil: endpoint Plano + Carencia.
- UI: seção **Meu plano** em `WalletTab.tsx`.

### Criptografia e env

```env
CRYPTO_KEY=          # hex 32 bytes — obrigatório para vínculos
DATABASE_URL=          # PostgreSQL
AMIL_CDP_URL=          # default http://127.0.0.1:9222; 0 desabilita
AMIL_ALLOW_BROWSER=    # default false
AMIL_CHROME_PATH=      # opcional
UNIMED_HEADLESS=       # default true para Unimed
```

### Subir ambiente (Windows)

```powershell
.\scripts\up.ps1          # mata node, sobe API + Web (ver AGENTS.md)
# Logs: api.log, web.log na raiz
```

---

## Stack Tecnológica

### Frontend
- **Web:** React 19 + Vite 6 + TypeScript + Ant Design 5
- **i18n:** react-i18next + i18next (pt-BR / EN)
- **Tema:** Paletas customizáveis + dark mode
- **Mobile:** React Native 0.76+ + Expo SDK 52+

### Backend
- **API:** Node.js 22 + TypeScript + Fastify 5
- **Validação:** Zod
- **Banco:** pg (raw driver) + neo4j-driver
- **Arquitetura:** Hexagonal (Ports & Adapters)
- **Scraper:** Playwright + Groq (Llama 3.3 70B) + Google Cloud Vision
- **OCR:** Python Tesseract 5 (impresso) + TrOCR (manuscrito clínico) + Google Cloud Vision (fallback pago)

### Agentes IA
- **Runtime:** Python 3.12 + FastAPI + LangChain
- **LLM:** Groq (via GROQ_API_KEY)

### Banco de Dados
| Ambiente | Relacional | Grafos |
|----------|-----------|--------|
| Cloud | Supabase PostgreSQL 17 | Neo4J AuraDB 5 (7cbe171c) |
| Local | PostgreSQL 17 (localhost:5432) | Neo4J 5 (localhost:7687) |

### Infraestrutura
- **Cloud:** GCP openhealth-503119 — billing ativo
- **Storage:** Cloud Storage — bucket openhealth-documents-503119
- **CI/CD:** GitHub Actions
- **Secrets:** GitHub Secrets (10+ variáveis)

---

## Arquitetura Hexagonal da API

```
┌─────────────────────────────────────────────────────┐
│                    ENTRYPOINT                        │
│              index.ts (Fastify)                      │
├─────────────────────────────────────────────────────┤
│            INFRASTRUCTURE (adapters)                 │
│  ┌─────────────┐  ┌──────────────────────────────┐  │
│  │ HTTP Layer  │  │  Persistence Layer            │  │
│  │ controllers │  │  {entity}.pg.repository.ts    │  │
│  │ routes      │  │  (implementa interfaces)      │  │
│  │ schemas(Zod)│  └──────────────────────────────┘  │
│  └──────┬──────┘                                    │
│         │                                           │
│  ┌──────┴──────────────────────────────────────┐    │
│  │  External Adapters                           │    │
│  │  - ConecteSUS Gateway (FHIR REST)            │    │
│  │  - Groq LLM Adapter                          │    │
│  │  - Google Cloud Vision OCR                   │    │
│  │  - Python Tesseract OCR                      │    │
│  │  - GCS File Storage                          │    │
│  └──────┬──────────────────────────────────────┘    │
├─────────┴───────────────────────────────────────────┤
│              APPLICATION (use cases)                 │
│         {entity}.service.ts                         │
│         agentic-scraper.service.ts                  │
│         (orquestra regras, depende de interfaces)   │
├─────────────────────────────────────────────────────┤
│               DOMAIN (core)                         │
│  ┌──────────────────┐  ┌────────────────────────┐   │
│  │ entities         │  │ repository interfaces │   │
│  │ (create/restore) │  │ (ports)               │   │
│  └──────────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Aiyra Connect (integrações — evolução)

Motor de integração em separação gradual do Core. **Doc completa:** `docs/CONNECT.md`.

| Camada | Pacote | Responsabilidade |
|--------|--------|------------------|
| Contrato | `packages/connect` | Registry, payload canônico, `ConnectPort` |
| Core | `packages/api` | Pacientes, import no domínio clínico, UI |
| Legado (migração) | `packages/api/.../scraper` | Playwright/sync até Fase 2 |

Fluxo alvo: Connect extrai → `CanonicalSyncBatch` → Core `CanonicalBatchImporter` → `import-lineage`.

### Linha de importação externa (complemento à hexagonal)

Qualquer dado que entra de fora do sistema segue o mesmo fluxo — paralelo aos adapters de infraestrutura:

```
┌──────────────┐    raw JSON     ┌──────────────────┐    adapter     ┌─────────────────┐
│ Portal/API   │ ──────────────► │ import_raw_records│ ─────────────► │ modelo interno  │
│ OCR/document │                 │ + import_batches  │   normalize    │ vaccines, exams…│
└──────────────┘                 └──────────────────┘                └─────────────────┘
                                        │                                    │
                                        └──────── import_raw_id ─────────────┘
```

| Camada | Responsabilidade |
|--------|------------------|
| **Infrastructure** | Gateway/scraper coleta payload; `ExternalDataAdapter` por fonte+tipo |
| **Application** | `ImportLineageService` + `ingestExternalRecord` (raw → normalizar → persistir → link) |
| **Domain** | `import_batches`, `import_raw_records`, porta `ImportLineageRepository`, `ExternalDataAdapter` |

Regras:

1. **Sempre** gravar `raw_json` fiel à origem em `import_raw_records` (nunca só o modelo interno).
2. **Sempre** ligar o registro interno via `import_raw_id` + `processed_table` / `processed_id`.
3. Normalização (catálogo PNI, TUSS, fuzzy) fica em `normalization` / `match_method` — separada do raw.
4. Um **adapter** por combinação fonte + tipo de registro (ex.: `cadernetaVaccineScheduleAdapter`).

Tabelas: `database/relational/016_vaccine_import_lineage.sql`, `017_import_lineage_general.sql`.

Código: `packages/api/src/domain/import-lineage/`, `application/import-lineage/`.

### Camadas

**Domain (core)** — Zero dependências externas.
- `Patient`, `GrowthRecord`, `Vaccine`, etc. — classes imutáveis com factories
- `PatientRepository`, `GrowthRecordRepository`, etc. — interfaces (portas)
- `HealthPortalScraper`, `FileStorage`, `OcrProvider` — portas de serviços externos
- `NotFoundError` — erro de domínio

**Application** — Depende apenas do domínio.
- `PatientService`, `GrowthRecordService`, etc. — casos de uso CRUD
- `AgenticScraperService` — orquestra scraping de portais de saúde
- `DocumentService` — upload + OCR + persistência

**Infrastructure** — Implementa as portas.
- `PatientPgRepository` — adaptador PostgreSQL
- `PatientController` — adaptador HTTP (Fastify)
- `ConecteSUSGateway` — gateway REST FHIR do ConecteSUS
- `CompositeOcrProvider` — OCR com fallback Python → Google Vision
- `GcsFileStorage` — storage Google Cloud Storage
- `CryptoHelper` — AES-256-GCM encrypt/decrypt via crypto-helper.ts
- `SyncProgressStore` — in-memory job store with progress + result (auto-cleanup ~2min após sync)
- `UnimedBhSyncScraper` — login → APIs OutSystems (extrato + autorizações) + Cartão Virtual na mesma sessão
- `UnimedBhCartaoVirtualScraper` — QR/token + campos do plano (`DadoCartaoCliente`)
- `UnimedBhLoginHelper` — login SSO Unimed BH (email+senha, Playwright)
- `AmilSyncScraper` — sync Amil: token salvo → CDP Chrome → Playwright (fallback); APIs REST Bearer
- `InsurancePlanService` — `upsertFromPortal` compartilhado Unimed/Amil

### Entidades Implementadas

| Entidade | Tabela | Filtros |
|----------|--------|---------|
| Patient | patients | — |
| GrowthRecord | growth_records | patientId |
| Vaccine | vaccines | patientId |
| Medication | medications | patientId |
| Allergy | allergies | patientId |
| Exam | exams | patientId |
| Document | documents | patientId, documentType |
| MedicalRecord | medical_records | patientId |
| Diagnosis | diagnoses | patientId, medicalRecordId |
| Authorization | authorizations | patientId |
| AuthorizationItem | authorization_items | authorizationId |
| IntegrationLink | integration_links | patientId, portal; campos: email (CPF Amil/Bradesco), encrypted_password, encrypted_session_token, session_expires_at, card_number |
| InsurancePlan | insurance_plans | operator + external_key |
| PlanMembership | plan_memberships | patientId, plan, member_number |

### Endpoints

```
HEALTH   GET  /health
         GET  /health/db

PATIENT  POST   /patients
         GET    /patients
         GET    /patients/:id
         PATCH  /patients/:id
         DELETE /patients/:id

GROWTH   POST   /growth-records
         GET    /growth-records?patientId=
         GET    /growth-records/:id
         PATCH  /growth-records/:id
         DELETE /growth-records/:id

VACCINE  POST   /vaccines
         GET    /vaccines?patientId=
         GET    /vaccines/:id
         PATCH  /vaccines/:id
         DELETE /vaccines/:id

MED      POST   /medications
         GET    /medications?patientId=&isActive=
         GET    /medications/:id
         PATCH  /medications/:id
         DELETE /medications/:id

ALLERGY  POST   /allergies
         GET    /allergies?patientId=
         GET    /allergies/:id
         PATCH  /allergies/:id
         DELETE /allergies/:id

EXAM     POST   /exams
         GET    /exams?patientId=
         GET    /exams/:id
         PATCH  /exams/:id
         DELETE /exams/:id

DOC      POST   /documents
         GET    /documents?patientId=&documentType=
         GET    /documents/:id
         PATCH  /documents/:id
         DELETE /documents/:id
         POST   /documents/upload            ← multipart + OCR

MEDREC   POST   /medical-records
         GET    /medical-records?patientId=
         GET    /medical-records/:id
         PATCH  /medical-records/:id
         DELETE /medical-records/:id

DIAG     POST   /diagnoses
         GET    /diagnoses?patientId=&medicalRecordId=
         GET    /diagnoses/:id
         PATCH  /diagnoses/:id
         DELETE /diagnoses/:id

INT LINK POST   /integration-links           ← criar vínculo (portal + encrypted password)
          GET    /integration-links?patientId= ← listar vínculos
          GET    /integration-links/:id
          PATCH  /integration-links/:id
          DELETE /integration-links/:id
          POST   /integration-links/:id/sync ← disparar sync assíncrono (retorna jobId); portais: unimed | amil
          GET    /integration-links/sync-progress/:jobId ← polling de progresso
          POST   /integration-links/sync-all ← sync todos os vínculos de um paciente
          POST   /integration-links/:id/virtual-card ← QR/token Unimed (Cartão Virtual)

PLAN     GET    /plan-memberships?patientId= ← memberships + plano (Meu plano na Carteira)

AUTH     POST   /authorizations
          GET    /authorizations?patientId=
          GET    /authorizations/:id
          PATCH  /authorizations/:id
          DELETE /authorizations/:id

SCRAPER  POST   /scraper/conectesus          ← importa dados do SUS (FHIR)
          POST   /scraper/unimed              ← importa dados Unimed (agente, legado)
          POST   /scraper/amil                ← importa dados Amil (agente)
          POST   /scraper/bradesco_saude      ← importa dados Bradesco Saúde (agente)
SESSIONS GET    /sessions                    ← histórico de desenvolvimento
```

---

## Arquitetura de Dados

### PostgreSQL - Schema Relacional

```sql
patients            -- dados cadastrais (cpf, cns, parent_ids, age_category)
  medical_records   -- consultas, atendimentos
    diagnoses       -- diagnósticos (opcional: vinculado à consulta)
  medications       -- medicações
  vaccines          -- vacinas (source: manual | conectesus | unimed | ...)
  allergies         -- alergias
  exams             -- exames (source column, dedup por examType+examDate)
  growth_records    -- peso/altura/IMC
  documents         -- metadados de arquivos
  integration_links -- vínculos persistentes (portal, email/CPF, encrypted_password, encrypted_session_token, card_number)
  insurance_plans   -- catálogo de planos por operadora (ANS, rede, segmentação, carências JSONB)
  plan_memberships  -- vínculo paciente↔plano (member_number, role, status, integration_link_id)
  authorizations    -- autorizações/guias (Unimed + Amil; solicitation_number, guide_password, items filhos)
  authorization_items -- procedimentos do pedido Unimed
  medical_records   -- consultas/atendimentos (source, copart, invoice; link opcional com authorization)
```

### Neo4J - Modelo de Grafos

```
Patient ──HAS_CONDITION──> Condition
Patient ──ALLERGIC_TO───> Allergen
Patient ──PRESCRIBED────> Medication
Medication ──INTERACTS_WITH──> Medication
Patient <──FOR──────────── Appointment
Doctor ──ATTENDED──────> Appointment
Document ──MENTIONS────> Patient|Condition|Medication
Symptom ──LED_TO───────> Diagnosis ──RESULTED_IN──> Treatment
```

---

## Scraper ConecteSUS

### Fluxo de Importação

```
Usuário informa CPF
    ↓
Abre navegador Chrome (non-headless)
    ↓
Usuário faz login manual no gov.br
    ↓
Captura token OAuth2 via Playwright
    ↓
Busca Patient no FHIR (ehr-search-gateway.saude.gov.br)
    ├── Extrai nome, CPF, CNS, birthDate
    ↓
Busca List de imunizações → para cada, busca Composition
    ↓
Busca List de exames
    ↓
Retorna dados para o frontend
    ↓
Match automático:
    ├── Por CPF (prioritário) → vincula paciente existente
    └── Por nome (fallback)  → sugere pacientes próximos
```

### Agentes Inteligentes (Planos de Saúde) — legado

Rotas `POST /scraper/{portal}` ainda existem com GenericAgentPortalAdapter (LLM + Playwright). **O fluxo principal de produção** para Unimed/Amil é `IntegrationLink` + scrapers dedicados (`UnimedBhSyncScraper`, `AmilSyncScraper`), não o agente genérico.

```
Browser (Playwright) — legado agentic
    ↓
auth.agent.ts  → LLM detecta campos de login
nav.agent.ts   → LLM navega HTML
extract.agent.ts → LLM extrai dados
```

### Pipeline de Extração de Vacinas

```
FHIR List (immunizations) → entry[].item.reference
    │
    ├── Composition/<id>  → busca Composition → extrai dose/lote/profissional do text.div
    └── (outro formato)   → ignora (dados básicos mantidos)
```

---

## Design System: Ant Design (antd)

**Ant Design 5** (https://ant.design) — biblioteca de componentes enterprise.

| Componente | Uso |
|-----------|-----|
| Layout, Sider, Header | Estrutura da aplicação |
| Card, Avatar | Cards das crianças no Dashboard |
| Table | Listagens de vacinas, medicações, exames... |
| Tabs | Navegação entre categorias no perfil |
| Form + DatePicker + Input + Select + Switch | Formulários CRUD |
| Modal | Criação/edição de registros |
| Tag | Status, gravidade, tipo sanguíneo, categoria idade |
| Spin, Empty | Loading, empty state |
| Menu | Sidebar navigation |
| ConfigProvider | Tema global (cores + dark mode) |
| Timeline | Histórico de sessões |
| Collapse | Agrupamento de itens por seção |
| Descriptions | Exibição de dados básicos do paciente |
| Steps | Progresso do sync no SyncProgressModal |
| Badge | Status tags de autorizações (authorized/used/expired) |

---

## Estrutura do Frontend (Web)

```
packages/web/src/
├── main.tsx                        ← Entrypoint (ThemeProvider + i18n)
├── App.tsx                         ← BrowserRouter + Routes
├── lib/
│   ├── api.ts                      ← HTTP client (fetch tipado)
│   └── api.types.ts                ← Tipos de todas as entidades
├── hooks/
│   └── use-patient-entity.ts       ← Hook genérico de listagem
├── theme/
│   ├── colors.ts                   ← Paletas (indigo, teal, rose)
│   └── ThemeProvider.tsx           ← Context + Ant Design ConfigProvider
├── i18n/
│   ├── index.ts                    ← i18next setup
│   └── locales/
│       ├── pt-BR.json              ← Tradução português
│       └── en.json                 ← Tradução inglês
├── components/
│   ├── ui/
│   │   ├── PageHeader.tsx          ← Header de página padrão
│   │   ├── EntityFormModal.tsx     ← Modal genérico para formulários
│   │   ├── LanguageSwitcher.tsx    ← Seletor PT/EN
│   │   ├── ThemeSwitcher.tsx       ← Paleta de cores + dark mode
│   │   ├── SourceTag.tsx           ← Badge colorida por source (manual, conectesus, unimed)
│   │   └── EntityTable.tsx         ← Tabela genérica com action column
│   ├── layout/
│   │   └── AppLayout.tsx           ← Sider + Header + Content
│   └── scraper/
│       ├── ImportConecteSUSModal.tsx
│       ├── ImportInsuranceModal.tsx  ← import agentic (legado)
│       └── SyncProgressModal.tsx     ← polling sync Unimed + Amil (timeout 5 min)
├── pages/
│   ├── dashboard.tsx
│   ├── integrations.tsx
│   ├── session.tsx
│   └── patient/
│       ├── detail.tsx              ← perfil + abas (Carteira, Autorizações, Arquivos…)
│       └── tabs/
│           ├── WalletTab.tsx       ← vínculos, sync, Meu plano, QR Unimed
│           ├── AuthorizationsTab.tsx
│           ├── DocumentsTab.tsx    ← UI "Arquivos"
│           └── … (Growth/Medidas, Vaccines, Exams, etc.)
└── styles/
    └── globals.css                 ← Variáveis CSS tema
```

### Roteamento

```
/                        → Dashboard
/patients/:id            → Perfil (Dados Básicos, Medidas, clínico, Carteira, Autorizações, Arquivos…)
/integrations            → Integrações
/session                 → Histórico de sessões (lê HISTORICO.md)
```

### Tema Customizável

3 paletas + dark mode via `ThemeProvider`:
```tsx
const { palette, setPalette, darkMode, toggleDarkMode } = useTheme()
```

### Internacionalização

i18n com fallback pt-BR + detector automático:
```tsx
const { t } = useTranslation()
t('patient.title') // "Minhas Crianças" (pt) / "My Children" (en)
```

---

## Status do Projeto

### Fase 1 - Fundação ✅
- [x] Repositório + monorepo
- [x] Schemas PG + Neo4J
- [x] API base + health checks
- [x] CI/CD

### Infraestrutura Cloud ✅
- [x] Supabase (PG cloud)
- [x] AuraDB (Neo4J cloud)
- [x] GCP (projeto + storage bucket)
- [x] GitHub Secrets
- [x] .env + setup script

### Fase 2 - Núcleo ✅
- [x] CRUD Patients (API + Frontend)
- [x] CRUD Medidas / GrowthRecords (API + Frontend) — UI: aba "Medidas"
- [x] CRUD Vaccines (API + Frontend)
- [x] CRUD Medications (API + Frontend)
- [x] CRUD Allergies (API + Frontend)
- [x] CRUD Exams (API + Frontend)
- [x] CRUD Arquivos (API + Frontend, entidade Document) + Upload c/ OCR
- [x] CRUD MedicalRecords (API + Frontend)
- [x] CRUD Diagnoses (API + Frontend)
- [x] Dashboard com cards agrupados por idade
- [x] Perfil paciente com 9 abas (Dados Básicos + 8 médicas)
- [x] CPF e CNS do paciente
- [x] Relação parental (pais/filhos)
- [x] Categorias de idade (criança/adolescente/adulto)
- [x] Scraper ConecteSUS (login gov.br + FHIR)
- [x] Página de integrações
- [x] Histórico de sessões (/session)
- [ ] Gráficos de crescimento (Recharts)
- [ ] Página de configurações

### Fase 3 - Integrações com Planos de Saúde ✅ (Unimed BH + Amil core)
- [x] Entidade IntegrationLink (vínculo persistente com portal + credenciais criptografadas)
- [x] Criptografia AES-256-GCM via crypto-helper.ts
- [x] Source tagging (source column em exams, vaccines, medical_records, authorizations)
- [x] Deduplicação na importação (exams: examType+examDate, authorizations: procedureCode+guideNumber, records: recordDate+doctorName)
- [x] Sync lock (impede execução concorrente por paciente+portal)
- [x] Sync progress com polling (SyncProgressModal com Steps)
- [x] Crawler Unimed BH combinado (extrato + autorizações, mesma sessão)
- [x] Entidade Authorization (create/restore, repository, PG, HTTP CRUD)
- [x] AuthorizationsTab com status tags (authorized/used/expired) e validade
- [x] Testes unitários: crypto-helper (4) + sync-progress-store (5) = 9 testes
- [x] Sync rico via APIs OutSystems (listagem + detalhe + procedimentos + prestador + histórico)
- [x] Entidade AuthorizationItem (itens/procedimentos do pedido)
- [x] Campos enriquecidos: solicitation_number, guide_password, specialty, locations, history
- [x] Resumo pós-sync com pedidos criados/atualizados e contagem de itens
- [x] Extrato via API OutSystems → MedicalRecord com copart/nota
- [x] Vínculo Authorization ↔ MedicalRecord (consulta origem)
- [x] Carteira (WalletTab): vínculo, sync, Meu plano, QR Unimed
- [x] InsurancePlan + PlanMembership + carências (`waiting_periods`)
- [x] Sync Amil: plano, carências, guias/tokens → Authorization
- [x] Auth Amil silenciosa: sessão JWT persistida + CDP Chrome real
- [x] **Sync Amil validado end-to-end** (plano, carências, guias, sessão persistida)
- [x] Prefill CPF Amil/Bradesco no modal de vínculo
- [x] Schema vínculo: email aceita CPF (não exige formato e-mail)

### Fase 3 — Pendências integrações
- [ ] Carências Unimed (`DeclaracaoCarencia` PDF Jasper)
- [ ] Utilização/exames Amil → MedicalRecord/Exam
- [ ] Sync Bradesco Saúde
- [ ] Dependentes Amil como pacientes vinculados

### Fase 4 - Agentes IA 🔜
- [ ] Agente pediatria operacional
- [ ] Agente integração (OCR/PDF)
- [ ] Agente farmacêutico

### Fase 4 - Entrega 🔜
- [ ] Frontend web funcional
- [ ] App mobile funcional
- [ ] Compartilhamento com médicos
- [ ] Backup e exportação
- [ ] **Export do prontuário (2 níveis)** — completo + resumido para o médico
- [ ] **Rede credenciada agregada** — busca unificada (SUS + planos) via adapters, estilo “Decolar”

---

## Open Design Integration

O **Open Design** (Powerformer v0.16.0) gerencia o design system do Open Health.

### Localização
```
%APPDATA%\Open Design\namespaces\release-stable-win\data\design-systems\
└── open-health-platform-for-users-and-patients/
    ├── DESIGN.md              ← Descrição para AI agents
    ├── brand.json             ← Paletas, tipografia, layout
    ├── metadata.json          ← Metadados do projeto
    └── system/
        ├── tokens.default.json
        ├── tokens.dark.json
        ├── tokens.palettes.json  ← Nossas 3 paletas (indigo/teal/rose)
        ├── variables.css
        ├── variables.dark.css
        ├── kit.html / kit.dark.html
        └── theme.json
```

### Integração com o Frontend

```
Open Design (tokens.palettes.json)
    ↓  sync-opendesign.ps1
Frontend (theme/colors.ts + ThemeProvider.tsx)
    ↓
Ant Design (ConfigProvider)
```

### Sincronização

```powershell
.\scripts\sync-opendesign.ps1           # Sincronizar uma vez
.\scripts\sync-opendesign.ps1 -Watch    # Ficar observando mudanças
```

O `ThemeProvider` lê os tokens do Open Design via `open-design-bridge.ts`
e aplica no `ConfigProvider` do Ant Design. As 3 paletas (indigo, teal, rose)
estão disponíveis no seletor de tema no header da aplicação.

---

## Scripts Úteis

```powershell
# Setup .env
.\scripts\setup-env.ps1          # Local
.\scripts\setup-env.ps1 -Cloud   # Cloud

# Iniciar ambiente dev (API + Web) — preferido no dia a dia
.\scripts\up.ps1

# Alternativa com PG/Neo local ou cloud explícito
.\scripts\start-dev.ps1          # Local
.\scripts\start-dev.ps1 -Cloud   # Cloud

# Iniciar apenas API
npm run api:dev         # packages/api

# Iniciar apenas Web
npm run web:dev         # packages/web

# Mobile
npm run mobile:start    # packages/mobile

# Agents
npm run agent:pediatria
npm run agent:integracao
npm run agent:farmaceutico
```

## Comandos Git

```powershell
git add -A
git commit -m "feat: descrição"
git push
```

---

## Migrations

```sql
-- 001_initial_schema.sql        - Criação inicial das tabelas
-- 002_parent_relationship.sql   - Adiciona parent_ids, cpf, cns
-- 003_source_column.sql         - Adiciona source column + integration_links + encrypted_password
-- 004_authorizations.sql        - Cria tabela authorizations com procedimentos, médico, clínica, guia, status
-- 005_authorization_enrichment.sql - Campos ricos do detalhe Unimed + tabela authorization_items
-- 006_consulta_authorization_link.sql - Extrato/copart em medical_records + medical_record_id em authorizations
-- 007_identity_document_types.sql - Tipos certidao_nascimento, rg, cpf_card, cnh no enum document_type
-- 008_ocr_metrics.sql             - Métricas OCR em documents
-- 009_insurance_plans.sql         - insurance_plans + plan_memberships (área do plano multi-operadora)
-- 010_integration_link_session.sql - encrypted_session_token + session_expires_at (sessão Amil)
-- 020_health_threads.sql         - Trilhas de saúde (Em andamento)
```

Para aplicar migrations manualmente (sem psql no PATH), executar o SQL via cliente PG apontando para `DATABASE_URL`. Arquivos em `database/relational/`.

### Contexto do projeto (LLM / agentes)

| Recurso | Uso |
|---------|-----|
| `docs/project-context.json` | Foto **curada** — camadas, decisões, roadmap, integrações (atualizar ao evoluir arquitetura) |
| `GET /project/context` | Agrega JSON + `HISTORICO.md` parseado + lista de migrations em runtime |
| `GET /sessions` | Só sessões do histórico (subset do context) |
| `docs/PROJETO.md` / `AGENTS.md` | Narrativa longa e instruções operacionais |

Agentes devem preferir `/project/context` para estado atual; markdown para detalhe profundo.

---

## Roadmap

Prioridades e épicos estruturados: **[ROADMAP.md](./ROADMAP.md)** (fonte JSON: `roadmap.json`). A UI do app lê via `GET /roadmap`.

---

## Roadmap — Contexto, trilhas e inteligência clínica (detalhe histórico)

> Alinhado à discussão de 2026-08-06: histórico completo, cruzamento inteligente (Neo4j), documentos/LLM, agentes de apoio e **resumo sem alucinação**.

### Visão em camadas

| Camada | O que é | LLM? | Status |
|--------|---------|------|--------|
| **A. Dados estruturados** | Postgres: consultas, exames, vacinas, meds, alergias, autorizações, plano, `import_lineage` | Não | ✅ Operacional |
| **B. Contexto determinístico** | `GET /patients/:id/context` — identidade, alertas, pendências, `textSummary`, timeline unificada | Não | ✅ Entregue |
| **C. Trilhas de saúde** (`HealthThread`) | “Em andamento”: tarefas, investigações, hipóteses, episódios com sintomas | Não (entrada manual rápida) | 📋 Próximo |
| **D. Documentos + OCR/LLM** | Arquivos, manuscrito, prescrição, laudos → estrutura | Sim (cascade) | 🔄 Paralelo |
| **E. Grafo Neo4j** | Relações: sintoma → hipótese → diagnóstico → exame; proveniência | Não no CRUD | 📋 Médio prazo |
| **F. Agentes de apoio** | “Médico agêntico” — volume + momento, sempre com fonte citada | Sim (RAG) | 📋 Depois de B+C |

**Ordem sensata:** A → B → **C** → D (paralelo) → E → F.

Neo4j **não substitui** Postgres; indexa relações e raciocínio. O grafo **projeta** eventos de PG + trilhas + lineage.

### Eixo 1 — Documentos + LLM/OCR

- [x] Tipos de identificação, OCR → CPF/nome/nascimento
- [x] UI “Arquivos”; cascade OCR (Tesseract / TrOCR / Vision)
- [ ] Melhorar entendimento de manuscrito (prescrição, laudo) — LLM na cascata
- [ ] Métricas e validação contínua de qualidade OCR

### Eixo 2 — Contexto do paciente (sem LLM)

- [x] `PatientContextService` + `GET /patients/:id/context`
- [x] Card **Resumo clínico** na aba Dados Básicos
- [x] Timeline horizontal recente no resumo (`PatientContextTimeline`)
- [x] Aba **Linha do tempo** com filtros (`TimelineTab` + `GET /patients/:id/timeline`)
- [ ] Incluir `activeThreads[]` e pendências derivadas de trilhas no context
- [ ] Export resumido médico (PDF) alimentado pelo context + trilhas abertas

### Eixo 3 — Trilhas de saúde (“Em andamento”)

Conceito único na UI com **kinds** distintos (input rápido + detalhe sob demanda):

| Kind | Exemplo | Entrada mínima |
|------|---------|----------------|
| `task` | Checkup inicial com médica da família | uma linha + data opcional |
| `investigation` | Luís — adenoides / trato respiratório | título + exames vinculados |
| `hypothesis` | Bruno — suspeita de alergia | linha + confiança (baixa/média) |
| `episode` | Febre → sintomas → hipótese → diagnóstico | sintoma + valor + “agora” |

**Fases de implementação:**

| Fase | Entrega | Neo4j |
|------|---------|-------|
| **3.1** | Migration `health_threads` + CRUD + card “Em andamento” no perfil + input 1 linha | Não | ✅ |
| **3.2a** | Wizard formal para abrir `investigation` / `task` + questionário inicial em `metadata` | Não | ✅ |
| **3.2b** | `health_thread_entries` + `health_thread_links` + drawer da trilha (mini-workflow) | Não | ✅ |
| **3.2c** | Atalhos: criar/vincular exame, consulta, autorização, nota — persiste na aba canônica + link na trilha | Não | ✅ |
| **3.3** | Conversão hipótese → diagnóstico/alergia; trilhas no context + notas na timeline global | Não | ✅ |
| **3.4** | Projeção Neo4j: `Symptom`—`SUGGESTS`—`Hypothesis`—`CONFIRMED_AS`—`Diagnosis` | Sim | ✅ MVP |

**Modelo PG (resumo):** `health_threads`, `health_thread_entries`, `health_thread_links` (exam, authorization, diagnosis, document, medical_record).

`diagnoses` permanece para **conclusão**; trilhas cobrem o que ainda não é diagnóstico formal.

#### Investigação / tarefa como workflow (Eixo 3.2)

**Investigação** e **tarefa** são contêineres de workflow; **hipótese** e **episódio** mantêm entrada rápida (1 linha).

| Abertura | UX | Depois |
|----------|-----|--------|
| Investigação | Modal wizard + micro-questionário (motivo, sintomas, hipótese de trabalho, próximos passos) | Drawer da trilha: iterar com notas + artefatos |
| Tarefa | Wizard curto (o quê, com quem, data objetivo) | Idem |
| Hipótese / episódio | Input 1 linha (como hoje) | Drawer com log de sintomas (episódio) |

**Princípio arquitetural:** atalhos na trilha **não duplicam dados**. Cada ação chama o use case existente (`ExamService`, `MedicalRecordService`, …) e cria um `health_thread_link` (+ opcional `entry` narrativa).

```text
UI (wizard / drawer)  →  HealthThreadWorkflowService  →  ExamService.create(...)
                              ↓                              ↓
                         health_thread_links          exams (aba Exames)
                         health_thread_entries      timeline clínica global
```

Roles de link (`health_thread_links.role`): `ordered` | `scheduled` | `result` | `related` | `blocked_by` | `note_only`.

Agendamento futuro: mesma mecanismo (`entity_type: appointment` quando existir módulo).

- [x] Aba **Linha do tempo** com filtros por tipo e período (`GET /patients/:id/timeline`)
- [ ] Worker: sync/import → nós/arestas Neo4j (`import_lineage`, Authorization, Doctor, Procedure)
- [x] Estender grafo: `Hypothesis`, `HealthThread`, `RULED_OUT`, `SUPPORTS` (após 3.4)
- [ ] Queries de caminho: medicação → consulta → exame → resultado

Schema base: `database/graph/001_initial_model.cypher`.

### Eixo 5 — Agentes médico de apoio

- [ ] Runtime com contexto = `PatientContext` + trilhas abertas + trechos citados (RAG sobre PG)
- [ ] Disclaimer fixo; nunca substituir médico
- [ ] LLM opcional para narrativa e correlação em documentos/OCR
- [ ] Esqueleto `packages/agents` (pediatria, farmacêutico)

### Como os eixos se alimentam (exemplos da família)

| Situação | Camada que resolve primeiro | Depois |
|----------|----------------------------|--------|
| Rafael — checkup pendente | Trilha `task` | Link consulta do extrato Unimed |
| Luís — exames adenoides | Trilha `investigation` + links exame/autorização | Grafo: exame `SUPPORTS` hipótese |
| Bruno — suspeita alergia | Trilha `hypothesis` | Confirmar → `allergy`; descartar → `ruled_out` |
| Menino com febre | Trilha `episode` + log de sintomas | Timeline + eventual `diagnosis` |

---

## Próximos Passos Imediatos

### Amil — estabilizar auth e enriquecer dados
- [x] Auth silenciosa (token + CDP); Playwright opt-in (`AMIL_ALLOW_BROWSER`)
- [x] Sync end-to-end validado (carteirinha, plano, carências, guias/tokens)
- [ ] Utilização Amil → consultas/exames
- [ ] Sessão: estender validade ou refresh automático via CDP em background

### Unimed — validar UI e plano
- [x] Expandir authorizations + authorization_items
- [x] Extrato + vínculo consulta
- [ ] Conferir Carteira (card_number populado após sync)
- [ ] Carências Unimed (PDF)

### Atual — Validar sync rico Unimed BH
- [ ] Conferir UI (Consultas + Autorizações expansível com vínculo)

### Roadmap (não bloquear sync)
- [ ] **Trilhas de saúde (Eixo 3)** — ver seção *Roadmap — Contexto, trilhas e inteligência clínica*
- [ ] Extrair nós Neo4J a partir de Authorization / AuthorizationItem / Doctor (Eixo 4)
- [ ] Organizar monólito hexagonal em multi-microserviços (API gateway + bounded contexts: patients, integrations, files, agents)
- [ ] Persistir foto do médico em GCS (hoje ignoramos base64 da API)
- [ ] Baixar PDF da guia ("Baixar guia") como Arquivo
- [x] **Documentos de identificação** (certidão, RG, CPF, CNH) — tipos próprios em Arquivos; prioridade para crianças
- [x] OCR em docs de identificação → sugerir/aplicar CPF, nome, nascimento no paciente
- [x] Fluxo pronto para upload da certidão dos meninos → CPF → Unimed
- [x] Renomear nomenclatura UI "Documentos" → "Arquivos" (evitar confusão com documentos pessoais)
- [x] Renomear aba "Crescimento" → "Medidas" (peso, altura, perímetro cefálico e futuras medições no mesmo lugar)
- [ ] Evoluir entidade/tabela de Medidas para aceitar novos tipos de medição além de antropometria clássica
- [ ] **Export do prontuário em dois níveis** (objetivo: apresentar ao médico) — alimentar resumido com `PatientContext` + trilhas abertas
  - [ ] **Completo** — histórico integral (consultas, autorizações, exames, vacinas, alergias, medicamentos, medidas, arquivos/OCR relevante)
  - [ ] **Resumido médico** — só o essencial para a consulta: identificação, alergias/medicações ativas, diagnósticos, últimas consultas, exames recentes/pendentes, vacinas em atraso, autorizações vigentes; formato apresentável (PDF/impressão)
- [ ] **Rede credenciada agregada (“Decolar” da saúde)** — módulo de busca unificada via adapters por provedor (SUS + planos do paciente: Unimed, Amil, Bradesco…); composição/ranking do resultado evolutivo; não é sync clínico, é descoberta de rede
- [x] **Área do plano (InsurancePlan + PlanMembership)** — domínio compartilhado Unimed/Amil; UI Meu plano na Carteira; upsert via sync Unimed (Cartão Virtual) e sync Amil (Plano + Carência); guias/tokens Amil → Authorization
- [ ] **Utilização Amil / carências Unimed (PDF)** — extrato/exames Amil; DeclaracaoCarencia Unimed ainda é Jasper

### Em espera
- [ ] Gráficos de crescimento (Recharts) no perfil do paciente
- [ ] Página de configurações (tema, idioma, backup)
- [ ] App mobile (React Native + Expo)
- [ ] Agentes IA (Eixo 5 — após context + trilhas)
- [ ] Compartilhamento de relatórios com médicos (complementa o export resumido)
