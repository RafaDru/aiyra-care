# Open Health - Documento Vivo do Projeto

> **Última atualização:** 2026-07-22
> **Status:** API Completa — Iniciando Frontend
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
├─────────┴───────────────────────────────────────────┤
│              APPLICATION (use cases)                 │
│         {entity}.service.ts                         │
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
- `NotFoundError` — erro de domínio

**Application** — Depende apenas do domínio.
- `PatientService`, `GrowthRecordService`, etc. — casos de uso
- Valida regras de negócio antes de persistir
- Lança `NotFoundError` quando entidade não encontrada

**Infrastructure** — Implementa as portas.
- `PatientPgRepository` — adaptador PostgreSQL
- `PatientController` — adaptador HTTP (Fastify)
- `patient.routes.ts` — plugin Fastify com injeção de dependência manual

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
```

---

## Arquitetura de Dados

### PostgreSQL - Schema Relacional

```sql
patients          -- dados cadastrais
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
| Tag | Status, gravidade, tipo sanguíneo |
| Spin, Empty | Loading, empty state |
| Menu | Sidebar navigation |
| ConfigProvider | Tema global (cores + dark mode) |

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
│   └── layout/
│       └── AppLayout.tsx           ← Sider + Header + Content
├── pages/
│   ├── dashboard.tsx               ← Cards das crianças
│   └── patient/
│       ├── detail.tsx              ← Perfil + 8 abas
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
/                        → Dashboard (cards das crianças)
/patients/:id            → Detalhe da criança (8 abas)
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

### Fase 2 - Núcleo ✅ (API) / 🔄 (Frontend)
- [x] CRUD Patients (API)
- [x] CRUD GrowthRecords (API)
- [x] CRUD Vaccines (API)
- [x] CRUD Medications (API)
- [x] CRUD Allergies (API)
- [x] CRUD Exams (API)
- [x] CRUD Documents (API)
- [x] CRUD MedicalRecords (API)
- [x] CRUD Diagnoses (API)
- [x] Setup frontend (Ant Design + i18n + tema + router)
- [x] Dashboard com cards das crianças
- [x] Perfil paciente com 8 abas + formulários CRUD
- [ ] Upload de documentos (integração GCS)
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
