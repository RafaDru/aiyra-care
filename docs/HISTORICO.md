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
- [ ] Upload de documentos (integração GCS)
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
