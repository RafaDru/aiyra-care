# Histórico do Projeto Open Health

## [2026-07-22] - Terceira Sessão: CRUDs Completos + Setup Frontend

### Contexto
Finalizada toda a infraestrutura cloud, implementamos todos os CRUDs da API
seguindo Arquitetura Hexagonal (Ports & Adapters) com TypeScript + Fastify.
Iniciamos o planejamento do frontend web com Design System.

### Decisões Arquiteturais da API
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Arquitetura | Hexagonal (Ports & Adapters) | Separação clara entre domínio, aplicação e infraestrutura |
| Validação | Zod | Type-safe, composável, integrado ao ecossistema |
| Entity Pattern | Classes imutáveis com factories (create/restore) | Consistência, proteção do domínio |
| Repository | Interface no domínio, implementação no infra | Inversão de dependência, testável |
| DI | Manual (construtores no routes.ts) | Simples, sem overhead de framework |

### Realizado

**Infraestrutura Cloud (completa)**
- [x] Supabase: PostgreSQL 17 cloud (lyljosprzmtapkocmxxa) + REST API + anon/service_role keys
- [x] AuraDB Neo4J: instância free (7cbe171c.databases.neo4j.io) conectada e testada
- [x] GCP: projeto openhealth-503119, billing ativo (conta 01D669-5010DA-C81EE4)
- [x] Cloud Storage API ativada + bucket openhealth-documents-503119 (us-central1, STANDARD)
- [x] CORS configurado, lifecycle policy (delete 365 dias)
- [x] Service account openhealth-account com papel Storage Admin
- [x] GitHub Secrets: GCP_BUCKET e todas as credenciais atualizadas
- [x] scripts/setup-env.ps1 atualizado com todos os endpoints cloud

**API - CRUDs Hexagonais (9 entidades)**
- [x] Patient (pacientes) — domain + application + PG repo + HTTP
- [x] GrowthRecord (peso/altura) — completo
- [x] Vaccine (vacinas) — completo
- [x] Medication (medicações) — completo
- [x] Allergy (alergias) — completo
- [x] Exam (exames) — completo
- [x] Document (documentos) — completo
- [x] MedicalRecord (consultas) — completo
- [x] Diagnosis (diagnósticos) — completo

**Estrutura final da API:**
```
packages/api/src/
├── index.ts                         ← entrypoint + 9 rotas registradas
├── db/
│   ├── postgres.ts                  ← Pool PG
│   └── neo4j.ts                     ← Driver Neo4J
├── domain/                          ← CORE (0 dependências externas)
│   ├── errors.ts
│   └── {patient, growth-record, vaccine, medication,
│        allergy, exam, document, medical-record, diagnosis}/
│       ├── {entity}.entity.ts       ← entidade (create/restore)
│       └── {entity}.repository.ts   ← porta (interface)
├── application/                     ← CASOS DE USO
│   └── {entity}/
│       └── {entity}.service.ts      ← orquestra regras
└── infrastructure/                  ← ADAPTADORES
    ├── persistence/
    │   └── {entity}.pg.repository.ts ← implementa porta (PG)
    └── http/{entity}/
        ├── {entity}.schema.ts       ← validação Zod
        ├── {entity}.controller.ts   ← handlers Fastify
        └── {entity}.routes.ts       ← plugin Fastify
```

### Próximos Passos
- [ ] Gráficos de crescimento (Recharts)
- [ ] Página de configurações
- [ ] Agentes IA integrados no frontend
- [ ] App mobile (React Native + Expo)

---

## [2026-07-22] - Quarta Sessão: Frontend Web

### Contexto
Iniciamos o frontend web com React + Ant Design + i18n + tema customizável.
Estrutura componentizada, responsiva, com suporte a múltiplos idiomas e paletas de cores.

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| UI Library | Ant Design 5 | Componentes enterprise maduros, tema via ConfigProvider |
| i18n | react-i18next | Padrão da indústria, detector automático de idioma |
| Tema | Context + ConfigProvider | Paletas indigo/teal/rose + dark mode |
| HTTP | fetch nativo + service layer | Sem dependência extra, tipado com TypeScript |
| Roteamento | react-router-dom | Padrão, lazy loading futuro |

### Realizado
- [x] Ant Design + react-router-dom + i18next instalados
- [x] ThemeProvider com 3 paletas (indigo, teal, rose) + dark mode
- [x] i18n pt-BR / EN com detector automático e fallback
- [x] Layout: sidebar colapsável + header com theme/language switcher
- [x] Dashboard: cards das crianças com idade, sexo, peso, altura
- [x] Perfil paciente: avatar, dados, 8 abas (crescimento, vacinas, medicações, alergias, exames, consultas, diagnósticos, documentos)
- [x] Formulários CRUD via modal em cada aba
- [x] API service layer tipado para todas as 9 entidades
- [x] Hook genérico `usePatientEntity` para listagem

### Estrutura Final do Frontend
```
packages/web/src/
├── main.tsx, App.tsx
├── lib/           api.ts + api.types.ts
├── hooks/         use-patient-entity.ts
├── theme/         colors.ts + ThemeProvider.tsx
├── i18n/          locales/pt-BR.json + en.json
├── components/
│   ├── ui/        PageHeader, EntityFormModal, LanguageSwitcher, ThemeSwitcher
│   └── layout/    AppLayout (Sider + Header + Content)
├── pages/
│   ├── dashboard.tsx
│   └── patient/
│       ├── detail.tsx
│       └── tabs/  8 entidades (Growth, Vaccines, Medications, etc.)
└── styles/        globals.css
```

---

## [2026-07-22] - Quinta Sessão: Open Design Integration

### Contexto
Integração do design system gerenciado pelo Open Design com o frontend
Ant Design. O Open Design mantém as paletas de cores, tokens e descrições
visuais, enquanto o frontend consome esses tokens via bridge.

### Realizado
- [x] Design system "open-health" atualizado no Open Design com 3 paletas
- [x] DESIGN.md com descrição completa de componentes e estilos
- [x] brand.json com paletas, tipografia, layout e voice & tone
- [x] tokens.palettes.json (indigo #4F46E5, teal #0D9488, rose #E11D48)
- [x] Frontend bridge (open-design-bridge.ts) que lê tokens do Open Design
- [x] ThemeProvider atualizado para usar tokens do Open Design + Ant Design
- [x] Script sync-opendesign.ps1 para sincronização automática
- [x] Documentação no PROJETO.md

### Fluxo
```
Open Design (tokens) → sync-opendesign.ps1 → ThemeProvider → Ant Design ConfigProvider → UI
```

---

## [2026-07-21] - Segunda Sessão: Setup Infraestrutura

### Realizado
- [x] .env gerado a partir de variáveis de ambiente da máquina
- [x] PostgreSQL local: database openhealth + schema relacional aplicado
- [x] Neo4J local (porta 7687) + schema de grafos aplicado
- [x] API Fastify: rotas /health e /health/db (PG ok, Neo4J ok)
- [x] GitHub Secrets: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE, NEO4J_*
- [x] scripts/setup-env.ps1 com suporte local e cloud
- [x] Correção: @neo4j/graph removido, neo4j-driver sem auth quando vazio

### Pendências da Sessão (resolvidas)
- [x] Supabase: novo projeto criado (lyljosprzmtapkocmxxa)
- [x] GCP: projeto openhealth-503119 + service account + bucket
- [x] AuraDB: instância free 7cbe171c.databases.neo4j.io

---

## [2026-07-21] - Fundação do Projeto

### Contexto
Criação do Open Health, sistema para centralizar histórico médico infantil.

### Crianças Cadastradas
- **Luís Drummond Freitas Reis** - Nasc: 23/01/2020 - 20kg
- **Bruno Drummond Freitas Reis** - Nasc: 26/10/2022 - 14kg

### Decisões Arquiteturais Iniciais
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Repositório | open-health (GitHub) | Novo repositório dedicado |
| Banco Relacional | PostgreSQL (Supabase) | Free Tier gerenciado |
| Banco de Grafos | Neo4J AuraDB Free | Free Tier gerenciado |
| Mobile | React Native + Expo | Multiplataforma |
| Web | React + Vite | Performance e simplicidade |
| Backend | Node.js + TypeScript | Tipagem forte, ecossistema rico |
| Agentes | Python (FastAPI) | Bibliotecas de IA/ML maduras |

### Estrutura Inicial do Projeto
```
open-health/
├── .github/workflows/   # CI/CD
├── docs/                 # Documentação viva e histórico
├── packages/
│   ├── web/              # React (Vite)
│   ├── mobile/           # React Native (Expo)
│   ├── api/              # Node.js/TypeScript
│   └── agents/
│       ├── pediatria/    # Agente de Pediatria
│       ├── integracao/   # PDF/OCR/Prontuários
│       └── farmaceutico/ # Medicações e Interações
├── database/
│   ├── relational/       # Schemas PostgreSQL
│   └── graph/            # Schemas Neo4J
├── .env.example
├── package.json
├── tsconfig.base.json
└── README.md
```

### Realizado na Fundação
- [x] Repositório GitHub criado (RafaDru/open-health) e push realizado
- [x] Estrutura monorepo montada (packages/web, mobile, api, agents)
- [x] Schemas PostgreSQL (8 tabelas)
- [x] Modelo Neo4J (nós e relacionamentos)
- [x] API base Fastify + conexões PG e Neo4J
- [x] Agent stubs (FastAPI)
- [x] CI/CD básico (GitHub Actions)
- [x] Docs: HISTORICO.md + PROJETO.md

---

## [2026-07-23] - Sexta Sessão: Melhorias + OCR

### Corrigido
- [x] CORS: `@fastify/cors` adicionado à API
- [x] EntityFormModal: catch vazio agora mostra erro real
- [x] `type: 'date'` removido de todos Form.Items (Ant Design v5 retorna dayjs, não Date)
- [x] `App.useApp()` sem provider — adicionado `<AntAppProvider>` no main.tsx
- [x] IMC calculado automaticamente no backend ao criar GrowthRecord
- [x] Estado vazio na Dashboard melhorado (link "Nova Criança")
- [x] Abas do paciente: `destroyInactiveTabPane` + `styles.body`
- [x] CORS methods: adicionado DELETE, PUT, PATCH, OPTIONS
- [x] api.ts: não envia `Content-Type: application/json` em DELETE (sem body)
- [x] Delete no Popconfirm: adicionado try/catch com mensagem de erro

### Implementado - OCR (Fase 1)
- [x] Domain interfaces: `FileStorage` e `OcrProvider` (portas)
- [x] `GcsFileStorage`: upload/download para GCS bucket
- [x] `GoogleVisionOcrProvider`: OCR via Google Cloud Vision API
- [x] `DocumentService.uploadAndCreate()`: upload + OCR + persistência
- [x] Rota `POST /documents/upload` (multipart, @fastify/multipart)
- [x] Frontend: input file real (Upload.Dragger) no DocumentsTab
- [x] i18n: chaves documentType.* e dropHint

### OCR Pipeline
```
DocumentService (application)
    │
    ▼
CompositeOcrProvider (infrastructure)
    │
    ├── PythonOcrAdapter (pytesseract local) ← primário
    │       └── python-ocr.py + Tesseract 5 + tessdata/por
    │
    └── GoogleVisionOcrProvider (cloud) ← fallback
            └── @google-cloud/vision + Vision API
```
- [x] PythonOcrAdapter: pytesseract + Pillow, fallback PATH automático
- [x] CompositeOcrProvider: tenta Python, fallback Google Vision
- [x] Tesseract 5 + tessdata por (português) instalados
- [x] Up.ps1 silencioso (*>$null) registrado no AGENTS.md

### Implementado - Scraper Agentic (Portais de Saúde)
```
domain/scraper/
├── portal-credentials.ts   ← tipos de credenciais
├── scraper-types.ts         ← ScrapedVaccine/Exam/Prescription
└── health-portal-scraper.ts ← HealthPortalScraper (porta)

application/scraper/
└── agentic-scraper.service.ts ← orquestrador

infrastructure/
├── llm/
│   └── groq-llm.adapter.ts       ← Llama 3.3 70B via Groq
├── scraper/
│   ├── browser-manager.ts         ← Playwright chromium headless
│   ├── agents/
│   │   ├── auth.agent.ts          ← login + diagnóstico de falhas
│   │   ├── nav.agent.ts           ← navegação por seções
│   │   └── extract.agent.ts       ← extração via LLM
│   └── conectesus.portal.ts       ← adapter ConecteSUS
```
- [x] Playwright + Groq SDK instalados
- [x] AuthAgent: login com LLM, diagnóstico de CAPTCHA/2FA/layout
- [x] NavAgent: navega inteligente por seções do portal
- [x] ExtractAgent: extrai vacinas, exames, receitas via LLM
- [x] ConecteSUSPortalAdapter completo

---

## [2026-07-24] - Sétima Sessão: Scraper ConecteSUS + Refinamentos

### Contexto
Finalização do scraper ConecteSUS via FHIR, correções no fluxo de login,
refatoração do modal de importação e adição de campos de documento pessoal
e relacionamentos familiares.

### Corrigido
- [x] Formulário de importação: removidos campos password/birthDate (login é feito manualmente no gov.br via navegador)
- [x] Erro FHIR Composition 404: parsing de referência corrigido (regex `Composition/id` em vez de `split('/composition/')`)
- [x] Botão "Editar" no perfil do paciente: estava sem `onClick`
- [x] `calcAge`: adicionada guarda para birthDate nulo/undefined
- [x] PATCH patient: undefined fields não sobrescrevem dados existentes (filtro `Object.entries` no service)
- [x] Dashboard atualiza lista após importação do ConecteSUS

### Implementado - Documentos Pessoais
- [x] Coluna `cpf` (VARCHAR(11) UNIQUE) na tabela patients
- [x] Coluna `cns` (VARCHAR(15)) na tabela patients
- [x] Extração automática de CPF e CNS do FHIR Patient (identifier array)
- [x] Match por CPF na importação (prioritário ao nome)
- [x] População automática de CPF/CNS ao criar ou vincular paciente

### Implementado - Relação Parental
- [x] Coluna `parent_ids UUID[]` na tabela patients (relação pai/filho)
- [x] Select múltiplo de pais/responsáveis no modal de edição
- [x] Exibição de pais e filhos na aba "Dados Básicos"
- [x] Tags clicáveis que navegam ao perfil do familiar

### Implementado - Categorias por Idade
- [x] Categoria computada no backend (`ageCategory`: children/adolescents/adults)
- [x] Dashboard agrupa pacientes em 3 seções com cabeçalho e contador
- [x] Cada card exibe a categoria como tag colorida
- [x] Ordem de exibição: Adultos → Adolescentes → Crianças

### Implementado - Integrações
- [x] Página `/integrations` com cards para cada integração
- [x] Card ConecteSUS disponível, demais marcados "Em breve"
- [x] Menu "Integrações" na sidebar (`ApiOutlined`)
- [x] Botão de importação removido do Dashboard

### Implementado - Sessões
- [x] Página `/session` com timeline do histórico de desenvolvimento
- [x] API `GET /sessions` que lê e parseia o `HISTORICO.md`
- [x] Menu "Sessões" na sidebar

### Estrutura Final da API
```
packages/api/src/
├── index.ts                         ← entrypoint + 11 rotas registradas
├── db/
│   ├── postgres.ts                  ← Pool PG
│   └── neo4j.ts                     ← Driver Neo4J
├── domain/                          ← CORE (0 dependências externas)
│   ├── errors.ts
│   ├── document/
│   │   ├── file-storage.ts          ← porta FileStorage
│   │   └── ocr-provider.ts          ← porta OcrProvider
│   ├── scraper/
│   │   ├── portal-credentials.ts    ← tipos de credenciais
│   │   ├── scraper-types.ts         ← ScrapedVaccine/Exam/Prescription
│   │   └── health-portal-scraper.ts ← interface HealthPortalScraper
│   └── {patient, growth-record, ...}/
│       ├── {entity}.entity.ts       ← entidade (create/restore)
│       └── {entity}.repository.ts   ← porta (interface)
├── application/                     ← CASOS DE USO
│   ├── scraper/
│   │   └── agentic-scraper.service.ts
│   ├── document/
│   │   └── document.service.ts      ← upload + OCR
│   └── {entity}/
│       └── {entity}.service.ts      ← orquestra regras
└── infrastructure/                  ← ADAPTADORES
    ├── persistence/
    │   └── {entity}.pg.repository.ts
    ├── conectesus/
    │   ├── fhir-types.ts            ← tipos FHIR
    │   └── conectesus-gateway.ts    ← gateway REST FHIR
    ├── llm/
    │   └── groq-llm.adapter.ts      ← Groq + Llama 3.3 70B
    ├── ocr/
    │   ├── composite-ocr.provider.ts
    │   ├── google-vision.ocr.ts
    │   └── python-ocr.adapter.ts
    ├── scraper/
    │   ├── browser-manager.ts
    │   ├── agents/
    │   │   ├── auth.agent.ts
    │   │   ├── nav.agent.ts
    │   │   └── extract.agent.ts
    │   └── conectesus.portal.ts
    ├── storage/
    │   └── gcs.storage.ts
    └── http/{entity}/
        ├── {entity}.schema.ts
        ├── {entity}.controller.ts
        └── {entity}.routes.ts
```

### Estrutura Final do Frontend
```
packages/web/src/
├── main.tsx, App.tsx
├── lib/           api.ts + api.types.ts
├── hooks/         use-patient-entity.ts
├── theme/         colors.ts + ThemeProvider.tsx
├── i18n/          locales/pt-BR.json + en.json
├── components/
│   ├── ui/        PageHeader, EntityFormModal, LanguageSwitcher, ThemeSwitcher
│   ├── layout/    AppLayout (Sider + Header + Content)
│   └── scraper/   ImportConecteSUSModal.tsx
├── pages/
│   ├── dashboard.tsx              ← cards agrupados por idade
│   ├── integrations.tsx           ← cards de integrações
│   ├── session.tsx                ← timeline do histórico
│   └── patient/
│       ├── detail.tsx             ← perfil + 9 abas (Dados Básicos + 8 médicas)
│       └── tabs/  Growth, Vaccines, Medications, etc.
└── styles/        globals.css
```

### Roteamento Final
```
/                        → Dashboard (cards agrupados por idade)
/patients/:id            → Detalhe do paciente (9 abas)
/integrations            → Página de integrações
/session                 → Histórico de sessões de desenvolvimento
```

---
