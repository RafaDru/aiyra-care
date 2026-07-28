# Open Health - Documento Vivo do Projeto

> **Última atualização:** 2026-07-27
> **Status:** Sync Unimed BH enriquecido (APIs OutSystems + AuthorizationItem + resumo)
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
- `SyncProgressStore` — in-memory job store with progress + result (auto-cleanup 5min)
- `UnimedBhSyncScraper` — combined scraper: login → extrato → autorizações em sessão única
- `UnimedBhLoginHelper` — shared login flow (email+password, Playwright)

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
| IntegrationLink | integration_links | patientId, portal (portal enum: unimed, amil, bradesco_saude) |

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
          POST   /integration-links/:id/sync ← disparar sync assíncrono (retorna jobId)
          GET    /integration-links/sync-progress/:jobId ← polling de progresso
          POST   /integration-links/sync-all ← sync todos os vínculos de um paciente

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
  integration_links -- vínculos persistentes com portais (credential_id, encrypted_password, portal)
  authorizations    -- autorizações de exames Unimed (procedure, doctor, clinic, dates, guide, status)
  medical_records   -- consultas/atendimentos (source column, dedup por recordDate+doctorName)
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

### Agentes Inteligentes (Planos de Saúde)

Unimed, Amil e Bradesco Saúde usam um GenericAgentPortalAdapter que combina:

```
Browser (Playwright non-headless)
    ↓
auth.agent.ts  → LLM detecta campos de login, preenche CPF/senha
    ↓
nav.agent.ts   → LLM analisa HTML, navega até seção alvo
    ↓
extract.agent.ts → LLM extrai vacinas, exames e receitas do HTML
```

Cada plano tem seu próprio portal adapter (`unimed.portal.ts`, `amil.portal.ts`, `bradesco-saude.portal.ts`)
que apenas configura URL e label — a lógica de scraping é compartilhada.

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
│       ├── ImportConecteSUSModal.tsx ← Modal de importação SUS
│       └── SyncProgressModal.tsx   ← Modal com Steps do sync Unimed BH
├── pages/
│   ├── dashboard.tsx               ← Cards agrupados por idade
│   ├── integrations.tsx            ← Página de integrações (Unimed BH vincular)
│   ├── session.tsx                 ← Timeline do histórico
│   └── patient/
│       ├── detail.tsx              ← Perfil + 10 abas (inclui Autorizações)
│       └── tabs/
│           ├── GrowthTab.tsx
│           ├── VaccinesTab.tsx      ← source column
│           ├── MedicationsTab.tsx
│           ├── AllergiesTab.tsx
│           ├── ExamsTab.tsx         ← source column
│           ├── MedicalRecordsTab.tsx ← source column
│           ├── DiagnosesTab.tsx
│           ├── DocumentsTab.tsx
│           └── AuthorizationsTab.tsx ← tabela com status tags + validade + source
└── styles/
    └── globals.css                 ← Variáveis CSS tema
```

### Roteamento

```
/                        → Dashboard (cards agrupados por idade)
/patients/:id            → Detalhe do paciente (9 abas)
/integrations            → Página de integrações
/session                 → Histórico de sessões
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

### Fase 3 - Integrações com Planos de Saúde ✅ (Unimed BH)
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

# Iniciar ambiente dev (API + Web)
.\scripts\start-dev.ps1          # Local (PostgreSQL + Neo4J locais)
.\scripts\start-dev.ps1 -Cloud   # Cloud (Supabase + AuraDB)

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
```

Para aplicar migrations manualmente:
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d openhealth -f database\relational\002_parent_relationship.sql
```

---

## Próximos Passos Imediatos

### Atual — Validar sync rico Unimed BH
- [x] Expandir authorizations + tabela authorization_items (migration 005)
- [x] Scraper via APIs OutSystems (DataActionListarSolicCliente + detalhe)
- [x] Extrato via API (`DataActionListarExtratoUtilizacao`) → consultas com valor/copart
- [x] Vincular Authorization → MedicalRecord (consulta origem, por PrestadorId + data)
- [ ] Conferir UI (Consultas + Autorizações expansível com vínculo)

### Roadmap (não bloquear sync)
- [ ] Extrair nós Neo4J a partir de Authorization / AuthorizationItem / Doctor (cruzamento para agentes)
- [ ] Organizar monólito hexagonal em multi-microserviços (API gateway + bounded contexts: patients, integrations, files, agents)
- [ ] Persistir foto do médico em GCS (hoje ignoramos base64 da API)
- [ ] Baixar PDF da guia ("Baixar guia") como Arquivo
- [x] **Documentos de identificação** (certidão, RG, CPF, CNH) — tipos próprios em Arquivos; prioridade para crianças
- [x] OCR em docs de identificação → sugerir/aplicar CPF, nome, nascimento no paciente
- [x] Fluxo pronto para upload da certidão dos meninos → CPF → Unimed
- [x] Renomear nomenclatura UI "Documentos" → "Arquivos" (evitar confusão com documentos pessoais)
- [x] Renomear aba "Crescimento" → "Medidas" (peso, altura, perímetro cefálico e futuras medições no mesmo lugar)
- [ ] Evoluir entidade/tabela de Medidas para aceitar novos tipos de medição além de antropometria clássica
- [ ] **Export do prontuário em dois níveis** (objetivo: apresentar ao médico)
  - [ ] **Completo** — histórico integral (consultas, autorizações, exames, vacinas, alergias, medicamentos, medidas, arquivos/OCR relevante)
  - [ ] **Resumido médico** — só o essencial para a consulta: identificação, alergias/medicações ativas, diagnósticos, últimas consultas, exames recentes/pendentes, vacinas em atraso, autorizações vigentes; formato apresentável (PDF/impressão)

### Em espera
- [ ] Gráficos de crescimento (Recharts) no perfil do paciente
- [ ] Página de configurações (tema, idioma, backup)
- [ ] App mobile (React Native + Expo)
- [ ] Agentes IA (pediatria, farmacêutico)
- [ ] Compartilhamento de relatórios com médicos (complementa o export resumido)
