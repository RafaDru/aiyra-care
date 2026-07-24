# Open Health - Documento Vivo do Projeto

> **Última atualização:** 2026-07-24
> **Status:** API Completa — Scraper ConecteSUS Integrado
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
- **OCR:** Python Tesseract 5 + Google Cloud Vision (fallback)

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

### Entidades Implementadas

| Entidade | Tabela | Filtros |
|----------|--------|---------|
| Patient | patients | — |
| GrowthRecord | growth_records | patientId |
| Vaccine | vaccines | patientId |
| Medication | medications | patientId, isActive |
| Allergy | allergies | patientId |
| Exam | exams | patientId |
| Document | documents | patientId, documentType |
| MedicalRecord | medical_records | patientId |
| Diagnosis | diagnoses | patientId, medicalRecordId |

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

SCRAPER  POST   /scraper/conectesus          ← importa dados do SUS
SESSIONS GET    /sessions                    ← histórico de desenvolvimento
```

---

## Arquitetura de Dados

### PostgreSQL - Schema Relacional

```sql
patients          -- dados cadastrais (cpf, cns, parent_ids, age_category)
  medical_records -- consultas, atendimentos
    diagnoses     -- diagnósticos (opcional: vinculado à consulta)
  medications     -- medicações
  vaccines        -- vacinas
  allergies       -- alergias
  exams           -- exames
  growth_records  -- peso/altura/IMC
  documents       -- metadados de arquivos
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
│   │   └── ThemeSwitcher.tsx       ← Paleta de cores + dark mode
│   ├── layout/
│   │   └── AppLayout.tsx           ← Sider + Header + Content
│   └── scraper/
│       └── ImportConecteSUSModal.tsx ← Modal de importação SUS
├── pages/
│   ├── dashboard.tsx               ← Cards agrupados por idade
│   ├── integrations.tsx            ← Página de integrações
│   ├── session.tsx                 ← Timeline do histórico
│   └── patient/
│       ├── detail.tsx              ← Perfil + 9 abas
│       └── tabs/
│           ├── GrowthTab.tsx
│           ├── VaccinesTab.tsx
│           ├── MedicationsTab.tsx
│           ├── AllergiesTab.tsx
│           ├── ExamsTab.tsx
│           ├── MedicalRecordsTab.tsx
│           ├── DiagnosesTab.tsx
│           └── DocumentsTab.tsx
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
- [x] CRUD GrowthRecords (API + Frontend)
- [x] CRUD Vaccines (API + Frontend)
- [x] CRUD Medications (API + Frontend)
- [x] CRUD Allergies (API + Frontend)
- [x] CRUD Exams (API + Frontend)
- [x] CRUD Documents (API + Frontend) + Upload c/ OCR
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

### Fase 3 - Agentes IA 🔜
- [ ] Agente pediatria operacional
- [ ] Agente integração (OCR/PDF)
- [ ] Agente farmacêutico

### Fase 4 - Entrega 🔜
- [ ] Frontend web funcional
- [ ] App mobile funcional
- [ ] Compartilhamento com médicos
- [ ] Backup e exportação

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
-- 001_initial_schema.sql - Criação inicial das tabelas
-- 002_parent_relationship.sql - Adiciona parent_ids, cpf, cns
```

Para aplicar migrations manualmente:
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d openhealth -f database\relational\002_parent_relationship.sql
```

---

## Próximos Passos Imediatos

- [ ] Gráficos de crescimento (Recharts) no perfil do paciente
- [ ] Página de configurações (tema, idioma, backup)
- [ ] Integração com planos de saúde (Unimed, Amil, Bradesco Saúde)
- [ ] App mobile (React Native + Expo)
- [ ] Agentes IA (pediatria, farmacêutico)
- [ ] Compartilhamento de relatórios com médicos
