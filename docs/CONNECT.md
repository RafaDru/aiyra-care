# Aiyra Connect — motor de integração

> Boundary entre **coletar/normalizar** (Connect) e **cuidar/importar** (Aiyra Core).

## Por que separar

A integração concentra Playwright, tokens, WAF, jobs longos e credenciais — diferente do CRUD clínico. Hoje isso está no `integration-link.controller` e em ~15 scrapers dentro de `packages/api`, o que:

- mistura HTTP, worker e persistência clínica;
- dificulta escalar syncs sem worker dedicado (`packages/connect-worker` ✅ runner apartado);
- faz cada portal conhecer `Exam`, `Authorization`, etc.

Connect extrai, normaliza e entrega **payload canônico**. O Core importa no domínio clínico e mantém **patient**, memberships e UI.

## Componentes

```
┌─────────────────────────────────────────────────────────────┐
│  Aiyra Core (packages/api + web)                            │
│  • Pacientes, memberships, auth                             │
│  • integration_links → vínculo connectionId ↔ patientId    │
│  • CanonicalBatchImporter → Exam, Authorization, Plan…      │
│  • UI: carteira, SyncProgressModal                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ ConnectPort (in-process → HTTP)
┌───────────────────────────▼─────────────────────────────────┐
│  Aiyra Connect (packages/connect → worker/service)          │
│  • Connector registry (categoria, auth, capabilities)       │
│  • Connection vault (credenciais cifradas, sessões)         │
│  • Sync engine (jobs, progress, locks)                      │
│  • Extractors por provider → CanonicalSyncBatch             │
└─────────────────────────────────────────────────────────────┘
```

## Pacote `@aiyra-care/connect` (Fase 1)

| Módulo | Conteúdo |
|--------|----------|
| `registry/` | `ConnectorDefinition`, `CONNECTOR_REGISTRY` |
| `canonical/` | `CanonicalRecord`, `CanonicalSyncBatch`, Zod |
| `contract/` | `ConnectPort`, `CanonicalBatchImporterPort`, rotas HTTP v1 |

Scrapers **ainda** em `packages/api` — migração incremental.

## Categorias de connector

| Categoria | Exemplos | Capabilities típicas |
|-----------|----------|----------------------|
| `payer` | Unimed BH, Amil, Bradesco | autorizações, carteira, cobertura |
| `provider` | Mater Dei, laboratórios | exames, atendimentos |
| `pharmacy` | (futuro) | dispensação, receitas |
| `government` | ConecteSUS, Caderneta | imunizações, import guiado gov.br |
| `identity` | gov.br | fluxos interativos |

## Auth profiles

| Profile | Uso |
|---------|-----|
| `oauth2` | Google/Microsoft no **Core** (não Connect) |
| `session_basic` | Unimed, Mater Dei (email/senha) |
| `session_token` | Amil JWT `userToken` |
| `interactive_govbr` | ConecteSUS, Caderneta |
| `interactive_otp` | Grupo Fleury Precision Care (SMS/e-mail/WhatsApp) |
| `api_key` | APIs REST futuras |

Credenciais ficam no **Connect vault** (evolução); o Core guarda hoje:

| Armazenamento | Quem | Uso |
|---------------|------|-----|
| `integration_links` | paciente × portal | email/CPF + senha cifrada + `encrypted_session_token` (Unimed, Amil, Mater Dei, Hermes) + `auth_attention` após falha de sync |
| `govbr_sessions` | conta (`account_id`) | token FHIR `govbr-proxy` após login interativo — ConecteSUS + Caderneta (migration **053**) |
| `calendar_connections` | conta × paciente | OAuth Google/Microsoft |

Gov.br **não** usa `integration_links` — identidade do responsável, não credencial de operadora.

## Contrato HTTP (Fase 3 — microserviço)

Base: `/v1` — ver `packages/connect/src/contract/api.ts`.

| Método | Rota | Quem chama |
|--------|------|------------|
| GET | `/v1/connectors` | Core / Web (lista portals) |
| POST | `/v1/connections` | Core (após usuário vincula) |
| GET | `/v1/connections/:id` | Core |
| POST | `/v1/connections/:id/sync` | Core → `{ jobId }` |
| GET | `/v1/sync-jobs/:jobId` | Web polling (via Core proxy) |
| POST | `/v1/internal/batches` | Connect → Core (service auth) |

Web **não** chama Connect diretamente — sempre via Core (auth Bearer + patient scope).

## Payload canônico

Lote entregue ao Core:

```typescript
interface CanonicalSyncBatch {
  batchId: string
  connectionId: string
  connectorId: string   // ex. amil_beneficiario
  jobId: string
  tenantRef?: string    // app_account.id
  status: 'completed' | 'failed' | 'partial'
  records: CanonicalRecord[]
  stats: Record<string, number>
  warnings?: string[]
}
```

Registros: `authorization`, `exam`, `medical_record`, `immunization`, `coverage`, `beneficiary`, etc.

Cada registro inclui `externalKey` (dedup) e `raw` (import-lineage).

### Mapeamento → import-lineage

| Canonical | ImportRecordType |
|-----------|------------------|
| `authorization` | `authorization` |
| `exam` | `exam` |
| `medical_record` | `clinical_record` |
| `immunization` | `vaccine_applied` |
| `coverage` | `insurance_plan` |
| `beneficiary` | `patient_identity` |

Pipeline existente: `external-import.pipeline.ts` + adapters por tipo.

## Vínculo paciente

Connect **não** decide qual filho é Luís vs Bruno para dados clínicos finais:

1. Connect pode enviar `beneficiary` hints no batch.
2. Core executa matching (`amil-beneficiary-matcher`, etc.).
3. `integration_links.patient_id` define o “contexto” do vínculo; matching refinado no import.

## Fases de implementação

### Fase 1 — Contrato no monorepo ✅ (este doc + `packages/connect`)

- Tipos canônicos e registry.
- `ConnectPort` / `CanonicalBatchImporterPort` definidos.
- Scrapers ainda no API.

### Fase 2 — Orquestrador + Unimed/Amil canônico ✅ (parcial)

- `PortalSyncOrchestrator` + `CanonicalBatchImporterService` em `packages/api/src/application/connect/`
- Sync **Unimed BH** e **Amil**: scrape → `CanonicalSyncBatch` → import + import-lineage
- **Incremental (2026-08-11):** `sync-delta.helper.ts` — janelas curtas em `silent=1` (extrato Unimed, PostTokens Amil, exames Mater Dei)
- **Hardening:** `browser-sync-mutex`, probe sessão Unimed, JWT-first Amil
- Mater Dei: ainda no controller (próximo piloto canônico full)

## Sync silencioso (estado atual)

| Camada | Comportamento |
|--------|----------------|
| Web Carteira | `useSilentWalletSync` — `sessionReady` + stale 6h; `usePatientSyncCompletions` refresh após sync OK |
| Web Integrações | Sincronizar manual + dock SSE; sync-all serial |
| API | `incremental = silent && !force`; mutex browser; `sync_jobs` em Postgres (SSE job + SSE paciente) |
| Fetch | Ver [SYNC_DELTA.md](./SYNC_DELTA.md) |
| Worker | `packages/connect-worker` — loop `CONNECT_WORKER_INTERVAL_MS`; `CONNECT_WORKER_EXTERNAL=1` na API |

## Grupo Fleury / Hermes Pardini (Precision Care)

Hermes Pardini **não** usa APIs isoladas — o portal de resultados é **Precision Care** do Grupo Fleury (`resultados.grupofleury.com.br`, API `api-plataforma.grupofleury.com.br/precision-care/paciente/api/v1`). Após a combinação de negócios (2023+), login unificado (OTP SMS/e-mail/WhatsApp) pode exibir exames de várias marcas na mesma conta.

| Tópico | Detalhe |
|--------|---------|
| Código sync | `hermes_pardini` portal type → scrapers `hermes-pardini-*` |
| Auth produção | Browser PKCE + senha protocolo; refresh HTTP |
| Auth PoC | `npm run probe:fleury-auth` / `probe:fleury-marca` |
| Doc | [FLEURY_PRECISION_CARE.md](./FLEURY_PRECISION_CARE.md) |
| Roadmap | épico `fleury-precision-care` |

### Fase 3 — Deploy separado

- Serviço Connect com vault dedicado.
- Core: `RemoteConnectClient` HTTP.
- Webhooks `sync.completed` opcionais (HTTP externo); hoje SSE `GET /patients/:id/sync-completions/stream` na web.

## Legado durante migração

| Hoje | Futuro |
|------|--------|
| `integration_links.portal_type` | `connectorId` + `legacyPortalType` no registry |
| `sync-progress-store` | `sync_jobs` PG — leitura/escrita só Postgres; SSE via `publishSyncJobEvent` |
| Controller persiste exames | Extractor → batch → importer |
| `packages/agents/integracao` (Python) | Avaliar merge ou agente dentro de Connect |

## SUS / gov.br (Core, Fase 1)

- Import guiado: `POST /scraper/conectesus` | `POST /scraper/caderneta` → `PublicHealthScrapeService`
- Sessão: `GovBrSessionService` + `govbr_sessions`; status `GET /account/govbr-session`
- Gateways: `ConecteSUSGateway`, `CadernetaGateway` + `GovBrTokenSession` (browser só se token expirado)
- Ver `docs/SUS_CONECTESUS.md`

## Falha de autenticação (portais com vínculo)

- Domínio: `packages/api/src/domain/portal-auth/portal-auth-failure.ts`
- Aplicação: `portal-sync-auth.helper.ts` → `auth_attention` no link + `failure_kind` no job
- UI: Integrações — “Atualize a senha” vs “Sincronize novamente”

## Referências no código

- Registry: `packages/connect/src/registry/connectors.ts`
- Port Core: `packages/api/src/domain/connect/` (reexport)
- Import pipeline: `packages/api/src/application/import-lineage/`
- Gov.br: `packages/api/src/application/govbr/`, `infrastructure/govbr/govbr-token-session.ts`
- UI sync steps: `packages/api/src/domain/scraper/sync-portal-profile.ts` (migrar perfis UI ao Connect depois)
