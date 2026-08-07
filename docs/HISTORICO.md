# Histórico do Projeto Open Health

## [2026-08-06] - Linha do tempo + projeção Neo4j (Eixos 3.4 e 4)

- `GET /patients/:id/timeline` com filtros (`kinds`, `sources`, `from`/`to`, `timelineMonths`, `limit`/`offset`); `PatientContextService.buildTimeline` sem quebrar `/context`.
- Aba **Linha do tempo** no perfil (`TimelineTab`): filtros por tipo/período, toggle linha horizontal vs lista.
- `HealthThreadGraphProjector` + `NEO4J_SYNC_ENABLED` (default off): upsert `Patient`/`HealthThread`/`Hypothesis`, `SUPPORTS`, `RULED_OUT`, `CONFIRMED_AS` após persist de trilhas.

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

## [2026-07-27] - Oitava Sessão: Unimed BH Sync + Source Tagging + Authorizations

### Contexto
Substituímos a abordagem de scraping agent-based (LLM genérico) por scrapers específicos para Unimed BH, com vínculo persistente por paciente, sync assíncrono com progresso, source tagging e entidade de autorizações.

### Decisões Arquiteturais
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Vínculo | IntegrationLink (tabela própria) | Persiste credenciais + portal, reutilizável para Amil/Bradesco |
| Criptografia | AES-256-GCM (crypto-helper.ts) | Senhas armazenadas com segurança, chave via CRYPTO_KEY |
| Sync | Assíncrono com polling (jobId) | Scraper leva >30s, não pode travar HTTP |
| Progresso | In-memory Map com auto-cleanup (5min) | Simples, sem dependência externa |
| Source tag | Coluna `source` em records + componente SourceTag | Rastreabilidade da origem dos dados |
| Dedup | Composite key antes do INSERT | Evita duplicatas em resyncs |
| Lock | Set<string> no controller | Impede execução concorrente por paciente+portal |

### Realizado

**Migrações SQL**
- [x] `003_source_column.sql`: source VARCHAR(50) NOT NULL DEFAULT 'manual' em exams, vaccines, medical_records; tabela integration_links (id, patient_id, portal, credential_id, encrypted_password, created_at, updated_at)
- [x] `004_authorizations.sql`: tabela authorizations com id, patient_id, procedure_code, procedure_description, doctor_name, doctor_council, clinic_name, authorization_date, validity_date, status ENUM, guide_number, quantity, notes, source, created_at

**Infrastructure**
- [x] `crypto-helper.ts`: encrypt/decrypt com AES-256-GCM, generateKey, algoritmo com IV aleatório + auth tag
- [x] `sync-progress-store.ts`: ProgressStore class — createJob, updateProgress, getProgress, removeJob com auto-cleanup via setTimeout
- [x] `unimedbh-login.helper.ts`: shared login flow — navega para `acesso.unimedbh.com.br`, preenche #username/#password, clica "Entrar"
- [x] `unimedbh-extrato.scraper.ts`: navega para Extrato de Utilização, extrai linhas da tabela (data, procedimento, prestador, valor), faz fallback para label "Data de Atendimento: <data>"
- [x] `unimedbh-autorizacoes.scraper.ts`: navega para Autorizações de Exames, extrai cards (procedimento, médico, clínica, datas, status, guia, quantidade)
- [x] `unimedbh-sync.scraper.ts`: scraper combinado — login uma vez, navega extrato → autorizações na mesma sessão, retorna ScrapedUnimedData

**Domain**
- [x] `authorization.entity.ts`: Authorization class com create/restore, toJSON com snake_case
- [x] `authorization.repository.ts`: interface (findById, findAll, save, update, delete)

**Persistence**
- [x] `authorization.pg.repository.ts`: implementação PG com mapeamento camelCase ↔ snake_case

**HTTP**
- [x] `integration-link.controller.ts`: CRUD + sync endpoint (com lock, decrypt, dedup, progress) + sync-all + sync-progress polling
- [x] `integration-link.schema.ts`: Zod schemas (createIntegrationLinkSchema, syncProgressParamsSchema)
- [x] `integration-link.routes.ts`: plugin Fastify com 7 rotas
- [x] `authorization/`: schemas, controller, routes com CRUD completo

**Frontend**
- [x] `SourceTag.tsx`: componente com cores por source (manual=blue, conectesus=green, unimed=volcano, amil=purple, bradesco_saude=orange)
- [x] `SyncProgressModal.tsx`: modal com Steps (navigate → login → fetch-extrato → fetch-autorizacoes → importing → done), polling automático a cada 1s, botão de fechar manual, tela de resultado
- [x] VaccinesTab, ExamsTab, MedicalRecordsTab: coluna "Origem" com SourceTag
- [x] AuthorizationsTab: tabela com procedimento, médico, clínica, datas, status (Tag colorida: authorized=blue, used=green, expired=red), validade, guia, origem; form-modal CRUD
- [x] Patient detail: adicionada aba "Autorizações" (10ª aba)
- [x] Integrations page: card Unimed BH com botão "Vincular" (modal com campos: email, password, dependente) e "Sincronizar" + "Remover"
- [x] `api.ts`: métodos authorizations.list/create, sync, syncProgress

**Tests**
- [x] Vitest configurado (vitest.config.ts + tsconfig.json paths)
- [x] `crypto-helper.test.ts`: 4 testes (encrypt/decrypt, reproduzibilidade, formato inválido, CRYPTO_KEY ausente)
- [x] `sync-progress-store.test.ts`: 5 testes (create/get, update progress, update com resultado, job inexistente, remove)

### Testes
```powershell
npx vitest run --config vitest.config.ts
# Results: 9 passed, 0 failed
```

### Status
```powershell
# Sync endpoint funcional (com lock + dedup + progress):
POST http://localhost:3000/integration-links/:id/sync
GET  http://localhost:3000/integration-links/sync-progress/:jobId

# Testado: login Unimed BH, navegação extrato e autorizações
# SyncProgressModal: steps atualizam em tempo real
```

### Non-functional
- Sync lock: retorna 409 se sync já estiver em execução para o mesmo paciente+portal
- Passwords armazenados criptografados (AES-256-GCM), descriptografados apenas no momento do sync
- Auto-cleanup de jobs de progresso após 5 minutos
- Dedup na importação: exams por examType+examDate, authorizations por procedureCode+guideNumber, records por recordDate+doctorName

---

## [2026-07-27] - Nona Sessão: Scraper Improvements + Rich Authorization Detail

### Contexto
Melhoramos a extração de datas do scraper de autorizações (fallback para linhas de data sem label), consolidamos testes, exploramos a página de detalhe via Chrome DevTools para extrair dados muito mais ricos (17 procedimentos, médico com foto, endereço, etc.), e organizamos a documentação.

### Realizado

**Scraper Date Fix**
- [x] `unimedbh-autorizacoes.scraper.ts`: quando label "Data de Autorização"/"Data de Validade" não é encontrada, agora percorre parágrafos em busca de linhas contendo data no formato DD/MM/YYYY; primeira data → authorizationDate, segunda → validityDate

**Chrome DevTools Exploration**
- [x] Navegação para `AutorizacoesDetalhe` no portal Unimed BH
- [x] Descoberta: página contém 17 itens de procedimento (não apenas 1), nome do médico com foto (blob URL), especialidade, endereço e telefone do local, número de solicitação, senha/password, timeline de histórico, botão "Baixar guia" (PDF)
- [x] Dados atuais do scraper simples são insuficientes — toda a riqueza da página de detalhe é desperdiçada

**Documentation**
- [x] PROJETO.md atualizado com todas as novas entidades, endpoints, arquitetura, estrutura frontend e próximos passos
- [x] HISTORICO.md atualizado com oitava e nona sessões

### Próximos Passos (Documentados no PROJETO.md)
1. Expandir migration authorizations com novas colunas (solicitation_number, password, specialty, doctor_photo_url, local_address, items JSONB, history JSONB)
2. Atualizar Authorization entity com novos campos
3. Fazer scraper navegar para página de detalhe de cada autorização e extrair dados completos
4. Testar sync end-to-end com credenciais reais (rafaeldruzak@yahoo.com.br)

---

## [2026-07-27] - Décima Sessão: Sync Rico Unimed BH via APIs OutSystems

### Contexto
Assumimos o refinamento do sincronismo Unimed BH. Em vez de parsear HTML da listagem, mapeamos as APIs OutSystems do portal (login Playwright → intercept screen services) e catalogamos pedido + itens + médico/local como entidades para cruzamento futuro (Neo4J/agentes).

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Fonte de dados | APIs OutSystems (screenservices) | JSON estruturado; HTML da listagem é pobre |
| Itens do pedido | Tabela `authorization_items` | Entidade própria para cruzamento futuro (não só JSONB) |
| Histórico/locais | JSONB em authorizations | Timeline e endereços variáveis; suficiente até grafo |
| Auth | IntegrationLink (email + senha AES-256-GCM) | Sync automático; login Playwright por job |
| Resumo | SyncResult com authorizationDetails | UX: o que foi criado/atualizado após cada sync |
| Neo4J / microserviços | Roadmap | Foco atual = sync; grafos e split depois |

### APIs mapeadas
- `DataActionListarSolicCliente` — lista pedidos (NumeroPedido, Senha, SolicIdEncriptado, médico, datas, status)
- `DataActionObterInformacoesSolicitacao` — ListaProcedimento (N itens)
- `DataActionObterPrestador` — especialidade + nome
- `DataActionObterInfoPrestador` — endereços/telefones
- `DataActionListarHistoricoSolic` — histórico do pedido

### Realizado
- [x] Migration `005_authorization_enrichment.sql`
- [x] Entity `Authorization` enriquecida + `AuthorizationItem`
- [x] Repos PG + schemas Zod + AuthorizationsTab expansível
- [x] `UnimedBhSyncScraper` reescrito para interceptar APIs e detalhar cada pedido
- [x] Sync com upsert por `solicitation_number` + resumo rico no modal
- [x] Docs: status + roadmap microserviços/Neo4J

### Próximos
1. Validar sync na UI
2. (Roadmap) Projetar Authorization/Doctor/Procedure no Neo4J
3. (Roadmap) Split em microserviços mantendo ports hexagonais
4. (Roadmap) Documentos de identificação + OCR → CPF → Unimed; UI "Arquivos"

---

## [2026-07-27] - Nomenclatura Arquivos + Roadmap Identificação

### Realizado
- [x] UI: aba/labels "Documentos" → "Arquivos" (pt-BR/EN) para não confundir com docs pessoais
- [x] Roadmap: docs de identificação (certidão etc.), OCR obrigatório populando paciente, CPF dos meninos para Unimed
- [x] UI: aba "Crescimento" → "Medidas"; PC → "Perímetro cefálico" (local para medições atuais e futuras)

---

## [2026-07-27] - Documentos de Identificação + OCR → Paciente

### Contexto
Backlog para importar dados dos meninos via certidão: tipos de identificação em Arquivos, OCR e aplicação de CPF/nome/nascimento no paciente (base para Unimed).

### Realizado
- [x] Migration `007_identity_document_types.sql` (certidao_nascimento, rg, cpf_card, cnh)
- [x] Parser `identity-document.parser.ts` (CPF com dígitos verificadores, data, nome, filiação)
- [x] Upload retorna `suggestedPatient`; endpoint `POST /documents/:id/apply-identity`
- [x] UI Arquivos: grupos Identificação/Clínicos; revisão OCR com checkboxes para aplicar no paciente
- [x] Testes parser (3) — total 12 testes API

### Como usar
1. Paciente → Arquivos → Adicionar Arquivo → Certidão de Nascimento (foto/scan)
2. Revisar OCR → marcar CPF (e nome/nascimento se quiser) → Confirmar e aplicar no paciente
3. CPF fica no cadastro para vincular/sincronizar Unimed

---

## [2026-07-27] - Roadmap: Export para o médico (2 níveis)

### Contexto
Precisamos levar o histórico ao consultório de forma útil — não só dump completo.

### Roadmap
- [ ] **Export completo** — prontuário integral do paciente
- [ ] **Export resumido** — informações relevantes para apresentar ao médico (alergias, medicações, diagnósticos, últimas consultas/exames, vacinas em atraso, autorizações vigentes), em formato apresentável (PDF/impressão)

---

## [2026-07-28] - Backlog: Rede credenciada agregada (“Decolar” da saúde)

### Contexto
Hoje cada operadora/SUS tem sua própria busca de rede. A ideia é um módulo de descoberta unificada no Open Health: o usuário/paciente busca uma vez e o sistema compõe resultados de vários provedores vinculados (e do SUS), melhorando o ranking com o tempo — análogo à Decolar para voos/hotéis, mas para rede credenciada.

### Backlog (não implementar agora)
- [ ] **Módulo Rede Credenciada** — busca (especialidade, local, nome, urgência etc.)
- [ ] **Arquitetura por adapters** — um adapter por fonte (SUS/ConecteSUS, Unimed BH, Amil, Bradesco Saúde, …), plugável conforme vínculos do paciente
- [ ] **Composição / ranking** — unificar resultados, deduplicar, ranquear e evoluir qualidade ao longo do tempo
- [ ] **UI de descoberta** — experiência tipo agregador (filtros, mapa/lista, origem do resultado por provedor)

### Fora de escopo imediato
- Não confundir com sync clínico (autorizações/extrato/carteira); este módulo é **descoberta de rede**, não importação de prontuário.

---

## [2026-07-28] - Discovery: Portal Beneficiário Amil (área logada)

### Contexto
Mapeamento inicial da Amil no browser do Cursor (SPA React em `https://www.amil.com.br/beneficiario/#/`) para futuro adapter de sync, no mesmo espírito do Unimed BH.

### Achados técnicos
- Auth: cookie `userToken` (JWT Bearer) + login por CPF/carteirinha
- APIs REST sob `/beneficiario/api/Beneficiario/...` (ex.: `ListaBeneficiarios`, `Plano`, `GuiasTokens/.../PostTokens`, `ListaBeneficiariosCarteirinha`)
- Home mostra carteirinha digital; rota `#/carteirinha` pode retornar “serviço não disponível” conforme perfil
- **Guias e tokens** (`#/guias-tokens`): lista pedidos com data, senha, token, situação, tipo, executante — filtrável por beneficiário (titular + dependentes)
- Menus relevantes: Rede credenciada, Meu plano, Minha saúde, Minha utilização, Reembolso, Telemedicina

### Backlog Amil (próximo)
- [x] Scraper/sync Amil via Playwright + APIs REST (Bearer): plano/carências + guias/tokens → autorizações
- [ ] Utilização Amil → consultas/exames; dependentes → pacientes adicionais
- [ ] Carteira digital Amil (QR/token se disponível no perfil)
- [ ] Adapter de rede credenciada Amil (quando o módulo agregado sair do backlog)
- [x] Domínio compartilhado `InsurancePlan` + `PlanMembership` (base multi-operadora)

---

## [2026-07-28] - Área do plano (Unimed ∩ Amil) + discovery Unimed Meu Plano

### Contexto
Amil e Unimed expõem o mesmo núcleo de “produto + vínculo do beneficiário”. Na Unimed isso já vem no Cartão Virtual (`DadoCartaoCliente`); há páginas Meu Plano adicionais (carência, 2ª via contrato, inclusão de serviços, info ANS).

### Unimed — páginas / campos em comum
- `CartaoVirtual` / `CarteiraVirtual` — token/QR + verso com ANS, acomodação, abrangência, CNS, contratante, validade, aditivos
- `InformacoesPlanosAns`, `DeclaracaoCarencia`, `SegundaViaContrato`, `InclusaoDeServicos` (200) — candidatos a carências/documentos do plano
- Campos alinhados à Amil: productCode/ANS, segmentation, accommodation, coverage, contractType, contractor, CNS, inclusionDate

### Realizado
- [x] Migration `009_insurance_plans.sql` (`insurance_plans` + `plan_memberships`)
- [x] Domínio + repos + `InsurancePlanService.upsertFromPortal`
- [x] `GET /plan-memberships?patientId=`
- [x] Cartão Virtual Unimed agora faz upsert de plano/membership e enriquece o payload
- [x] UI Carteira: seção **Meu plano** (inclui carências quando houver)
- [x] Sync clínica Unimed também atualiza plano/membership (Cartão Virtual na mesma sessão)
- [x] Sync Amil: login AuthOGS → `ListaBeneficiarios` / `Plano` / `Carencia` → `upsertFromPortal`; `PostTokens` → `Authorization`
- [x] UI syncável: Unimed + Amil (vincular e sincronizar / botão sync na carteira)

### Pendente
- [ ] Carências Unimed via `DeclaracaoCarencia` (PDF Jasper — sem lista estruturada ainda)
- [ ] Utilização / exames / vacinas Amil

---

## [2026-07-28] - Sync Amil + plano na sync Unimed + carências

### Realizado
- `AmilSyncScraper` (Bearer após `api/AuthOGS/Login`)
- `waiting_periods` no `PortalPlanSnapshot` / upsert
- Unimed sync enriquece `InsurancePlan`/`PlanMembership`
- Carteira mostra carências sincronizadas

---

## [2026-07-28] - Décima-primeira Sessão: Login Amil, WAF e preenchimento de formulário

### Contexto
Primeiros syncs Amil falhavam com "usuário ou senha inválidos" e depois 403. Debug colaborativo no browser confirmou: CPF estava correto; a senha não entrava no redux-form do portal. WAF da Amil bloqueia POST de login quando disparado por Playwright automatizado.

### Achados
- Login Amil: `POST /beneficiario/api/AuthOGS/Login` com `{ userData: { login, senha, idSistema: 400 } }` — CPF sem máscara no payload.
- Cookie/sessão: `userToken` (JWT Bearer); expiração ~30 min.
- JWT: carteirinha/marca ótica em `objeto.login` (ex.: `094995656`), não em `marcaOtica`.
- `page.fill()` no campo senha deixa valor vazio no React — necessário native value setter + eventos `input`/`change`.
- Playwright (mesmo headed) recebe **403 WAF** no POST de login; login manual pelo usuário no mesmo browser funciona.

### Realizado
- [x] `setReactInputValue` + validação de CPF/senha antes do submit
- [x] Detecção de POST sem senha no body
- [x] Mapeamento JWT `objeto.login` para marca ótica / carteirinha
- [x] Chrome visível por padrão (`AMIL_HEADLESS=false`)
- [x] Fluxo colaborativo: preencher + aguardar clique manual em Entrar
- [x] `SyncProgressModal`: steps unificados Unimed/Amil, timeout cliente 5 min, mensagem única no footer

### Arquivos
- `packages/api/src/infrastructure/scraper/amil-sync.scraper.ts`
- `packages/web/src/components/scraper/SyncProgressModal.tsx`

---

## [2026-07-28] - Décima-segunda Sessão: Auth Amil silenciosa (token + CDP)

### Contexto
Usuário pediu sync sem abrir browser detectável pelo WAF. Playwright continua flagado; solução: reutilizar sessão JWT e conectar ao **Chrome real** via CDP.

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Sessão Amil | `encrypted_session_token` em `integration_links` | Sync subsequente 100% HTTP |
| CDP | `chromium.connectOverCDP` + perfil `.cache/amil-chrome-cdp` | Chrome real não é Playwright launch |
| Playwright Amil | Opt-in `AMIL_ALLOW_BROWSER=1` | WAF bloqueia automação |
| Primeiro login | Auto-launch Chrome com `--remote-debugging-port=9222` | UX sem comando manual |

### Realizado
- [x] Migration `010_integration_link_session.sql`
- [x] `IntegrationLink`: `encryptedSessionToken`, `sessionExpiresAt`, `setSessionToken`, `clearSessionToken`
- [x] `AmilSyncScraper`: ordem token → CDP → browser; `syncWithToken` via `playwright.request` (sem browser)
- [x] `tryReadTokenFromCdp` + `loginViaCdpChrome` + `ensureCdpChromeRunning`
- [x] `runAmilSync` persiste token após sync; limpa sessão em 401/403
- [x] `.gitignore`: `.cache/`
- [x] Documentação: `PROJETO.md`, `HISTORICO.md`, `AGENTS.md`, `README.md`

### Variáveis de ambiente (Amil)
- `AMIL_CDP_URL` — default `http://127.0.0.1:9222`
- `AMIL_ALLOW_BROWSER` — default false
- `AMIL_CHROME_PATH` — opcional
- `AMIL_MANUAL_LOGIN_TIMEOUT_MS` — default 300000

### Fluxo operacional atual
1. Sync tenta token salvo → APIs Amil direto.
2. Se expirado: abre/conecta Chrome CDP, preenche CPF/senha, usuário clica Entrar.
3. Token salvo no vínculo; próximos syncs silenciosos até expirar.

### Pendente
- [x] Validar primeiro sync CDP end-to-end em produção local ✅ **2026-07-28**
- [ ] Renovação proativa de sessão (CDP em background antes de expirar)
- [ ] Utilização Amil → MedicalRecord/Exam

---

## [2026-07-28] - Documentação para continuidade de sessões IA

### Realizado
- [x] `docs/PROJETO.md` — seção **Como a plataforma opera agora** (fluxo usuário, sync Unimed/Amil, env, arquivos-chave)
- [x] `docs/HISTORICO.md` — sessões 11–12 Amil + este registro
- [x] `AGENTS.md` — instruções operacionais expandidas
- [x] `README.md` — quick start + links para docs

---

---

## [2026-08-06] - ProjectContext para LLM e agentes

### Contexto
Necessidade de refletir decisões e foto atual da aplicação em entidade estruturada consumível por LLMs/agentes, alinhada ao catálogo de relações planejado.

### Realizado
- [x] `docs/project-context.json` — snapshot curado (camadas, domínios, decisões, roadmap, trilhas, catálogo de relações planejado)
- [x] `GET /project/context` — agrega JSON + `HISTORICO.md` parseado + migrations
- [x] Parser compartilhado `historico.parser.ts` (usado por `/sessions` e `/project/context`)
- [x] `api.project.context()` no web client; `AGENTS.md` e `README.md` atualizados
- [x] Testes `project-context.test.ts`

### Decisão
| Decisão | Motivo |
|---------|--------|
| JSON curado + API dinâmica | LLM lê um payload; humanos mantêm `project-context.json` ao mudar arquitetura |
| HISTORICO parseado na API | Histórico cronológico completo sem duplicar manualmente cada sessão no JSON |

---

## [2026-08-06] - Roadmap: contexto determinístico + trilhas de saúde

### Contexto
Discussão sobre evolução clínica da plataforma: histórico completo, Neo4j para hipóteses, documentos/LLM, agentes de apoio, e resumo do paciente **sem LLM**. Proposta de “assuntos em andamento” (tarefas, investigações, hipóteses, episódios com sintomas).

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Resumo base | Postgres + template (`PatientContext`) | Fatos com proveniência; sem alucinação |
| Trilhas | `HealthThread` com kinds `task`, `investigation`, `hypothesis`, `episode` | Um conceito na UI; inputs diferentes |
| Diagnóstico formal | Tabela `diagnoses` existente | Trilhas cobrem pré-diagnóstico e suspeitas |
| Neo4j | Projeção após PG + trilhas | CRUD no PG; grafo para relações e agente |
| Ordem | Context → Trilhas → Neo4j → Agentes | Agentes precisam de contexto factual |

### Realizado (sessão)
- [x] `GET /patients/:id/context` — agregação determinística
- [x] `PatientContextPanel` + timeline horizontal no perfil
- [x] Seção **Roadmap — Contexto, trilhas e inteligência clínica** em `docs/PROJETO.md`
- [x] **Eixo 3.1** — `health_threads`, API CRUD, card **Em andamento** (`HealthThreadsPanel`)

### Roadmap integrado (próximos)
1. **Eixo 3.2** — entradas, sintomas, links a exame/autorização
2. **Eixo 3.3** — conversão hipótese → diagnóstico/alergia; context enriquecido
3. **Eixo 4** — lineage → Neo4j + aba timeline com filtros
4. **Eixo 5** — agente com `PatientContext` + trilhas + citações

### Exemplos mapeados
- Rafael: trilha `task` (checkup médica família)
- Luís: trilha `investigation` (adenoides / respiratório + exames)
- Bruno: trilha `hypothesis` (suspeita alergia)
- Episódio febre: trilha `episode` → log sintomas → timeline → diagnóstico

---

## [2026-07-28] - Amil: sync validado ✅

### Status
**Integração Amil operacional.** Sync completo testado com sucesso após auth via Chrome CDP (login manual em Entrar) + persistência de sessão.

### O que funciona
- Vincular paciente com CPF + senha do portal beneficiário Amil
- Sync assíncrono na aba **Carteira** (`WalletTab`)
- Login: token salvo → sync silencioso; ou Chrome CDP (`.cache/amil-chrome-cdp`) na primeira vez / sessão expirada
- Importação: **plano** + **carências** → `InsurancePlan` / `PlanMembership` (Meu plano)
- Importação: **guias/tokens** → `Authorization`
- Carteirinha/marca ótica via JWT `objeto.login` (ex.: plano LINCX)

### Ainda fora de escopo
- Utilização Amil (consultas/exames) → `MedicalRecord` / `Exam`
- Carteira digital Amil (QR) se disponível no perfil
- Dependentes como pacientes separados

---
