# Project Instructions for AI Agents

## What is this project

**AiyraCare (Filhos)** — monorepo for child healthcare with centralized medical history (Luís and Bruno). Stack: Fastify API + React/Vite web + PostgreSQL. Living docs: `docs/PROJETO.md`; decision log: `docs/HISTORICO.md`.

**Context for LLMs/agents:** `GET http://127.0.0.1:3010/project/context` — structured app snapshot + decisions + parsed `HISTORICO.md` + migrations list. Curated source: `docs/project-context.json` (update on architecture/roadmap changes). **Prioritized roadmap:** `docs/roadmap.json` + UI menu (`GET /roadmap`).

## Monorepo structure

npm workspaces (`packages/*`, `packages/agents/*`):

| Package | Stack | Purpose |
|---------|-------|---------|
| `packages/api` | Node 22 + Fastify 5 + TypeScript (hexagonal) | Backend |
| `packages/web` | React 19 + Vite 6 + Ant Design 6 | Frontend |
| `packages/connect` | TypeScript + Zod | Canonical connector contract |
| `packages/connect-worker` | TypeScript | Standalone scheduled sync runner |
| `packages/neo4j-lineage-worker` | TypeScript | Neo4j lineage backfill |
| `packages/mobile` | React Native + Expo | Skeleton |
| `packages/agents/*` | Python FastAPI | Agent services (pediatria, integracao, farmaceutico) |

## Starting services

When user says "up", "sobe", "sobe os serviços", or "restart":

```powershell
taskkill /F /IM node.exe 2>&1 | Out-Null
Start-Sleep 2
powershell -File "C:\Users\rafae\Documents\Filhos\scripts\up.ps1" *>$null
```

Always use `*>$null` to suppress output so the chat doesn't get stuck.

## Dev servers

- **API:** http://127.0.0.1:3010/health — `cd packages/api && npm run dev` (tsx watch)
- **Web:** http://localhost:5173 — `cd packages/web && npm run dev` (vite)
- **Logs:** `api.log` and `web.log` in project root
- **DB:** `postgresql://postgres:postgres123@127.0.0.1:5432/openhealth`

## Build, test, lint

```powershell
# API build + tests
cd packages/api && npm run build    # tsc
cd packages/api && npx vitest run   # tests

# Web build
cd packages/web && npm run build    # tsc --noEmit && vite build

# Connect typecheck
cd packages/connect && npm run typecheck

# Python agents (CI check)
cd packages/agents/<name> && pip install -r requirements.txt && python -c "from main import app; print('OK')"
```

There is **no top-level lint or typecheck** — root `npm run lint` is a no-op (`echo 'linting'`).

## API architecture (hexagonal)

`packages/api`: `domain/` → `application/` → `infrastructure/`

- **Integration links:** `IntegrationLink` (credentials + session) → scrapers → `InsurancePlanService.upsertFromPortal` + import of `Authorization` / `MedicalRecord` / `Exam`
- **Async sync:** `POST /integration-links/:id/sync` returns `jobId`; query `silent=1` (no modal) or `force=1` (ignore interval). UI: auto silent in **Carteira** tab (`useSilentWalletSync`); modal only on **Sincronizar** button in Integrações. Polling: `GET /integration-links/:id/sync-status` (15s; pauses on dock/SSE) + `sync-progress/:jobId/stream`.
- **Incremental sync:** `sync-delta.helper.ts` — Unimed: 2 months extract + auth detail since `lastSync−14d`; Amil: `PostTokens` since `lastSync−14d` (or 2 months), **no** plan/eligibility fetch; Mater Dei: exams since `max(exam_date)−14d`; Hermes Pardini: `GET /pedidos` since `max(exam_date)−14d` + `/pedidos/{id}/exames`. Manual/`force` = full window.
- **Sync jobs Postgres-only:** `createJob`/`updateJob`/`getJob` persist in PG; SSE via `publishSyncJobEvent`; heartbeat reconciles with `findById`.
- **Scheduled sync:** `IntegrationLinkSyncService.runScheduledBatch()` — `trigger=scheduled`, silent + `sessionReady`; `packages/connect-worker` (loop) or `run-scheduled-syncs.mjs`; built-in API loop only if `SYNC_SCHEDULED_INTERVAL_MS` set and no `CONNECT_WORKER_EXTERNAL=1`.
- **Credentials:** AES-256-GCM via `CRYPTO_KEY` in `.env` (`crypto-helper.ts`)
- **Auth:** Supabase (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE`), global hook in `security.plugin.ts`; per-patient scope via `patient_memberships` + `owner_account_id` (`patient-access.guard.ts`). See `docs/SUPABASE.md`.
- **Connect boundary:** `packages/connect` is the canonical contract; scrapers remain in `packages/api` until Phase 2. See `docs/CONNECT.md`.

## Sync by portal

| Portal | Auto sync | Auth method | Imports |
|--------|-----------|-------------|---------|
| **Unimed BH** | Yes | Playwright login `acesso.unimedbh.com.br` | Extract (consults/copay), authorizations (OutSystems APIs), plan (Virtual Card), QR/token |
| **Amil** | Yes (validated) | Saved JWT → CDP Chrome → Playwright (fallback) | Plan, eligibility, guides/tokens → `Authorization` |
| **Bradesco Saúde** | No (link + manual import only) | — | — |
| **ConecteSUS** | Manual gov.br import | Interactive FHIR login | Vaccines, exams |
| **Mater Dei** | Yes | Scraper + JSON session | Exams, visits, reports/images |
| **Hermes Pardini** | Yes (PKCE session) | Browser OAuth PKCE (+ HTTP refresh) | Exams via `paciente/api/v1/pedidos` + report PDF |

**Silent sync on Carteira:** auto-sync only fires with valid persisted session (`sessionReady`); first login always via **Sincronizar** button (may open portal/Chrome). API ignores `silent=1` without session (`skipped: session_required`).

**Sync progress (UI):** push-first via SSE `GET /integration-links/sync-progress/:jobId/stream` (heartbeat ~25s); GET `/sync-progress/:jobId` only reconciles if stream silent >45s. **Terminal sync per patient:** SSE `GET /patients/:id/sync-completions/stream` (`completed`/`failed`) → refresh context + wallet. See `docs/SYNC_DELTA.md` for per-portal incremental sync.

### Key env vars

| Variable | Default | Effect |
|----------|---------|--------|
| `AMIL_CDP_URL` | `http://127.0.0.1:9222` | CDP endpoint; `0` disables |
| `AMIL_ALLOW_BROWSER` | `false` | `1` enables Playwright (WAF often blocks) |
| `SYNC_MIN_INTERVAL_MS` | `1800000` (30 min) | Skip sync if last OK job recent (unless `force=1`) |
| `SYNC_SCHEDULED_INTERVAL_MS` | `0` (off) | Built-in scheduled loop (use `0` with external worker) |
| `CONNECT_WORKER_EXTERNAL` | `0` | `1` disables built-in loop — run `packages/connect-worker` |
| `OPS_METRICS_KEY` | — | Protege `GET /ops/metrics` e `/ops/alerts`; header `x-internal-ops-key` |
| `OPS_ALERT_WEBHOOK_URL` | — | Slack webhook; `npm run ops:alerts-check`; ver `docs/infra/OPS_ALERTS_PRODUCTION.md` |
| `OPS_ALERTS_INTERVAL_MS` | `0` | Loop alertas no connect-worker (preferido) ou API single-instance |
| `VITE_SILENT_SYNC_STALE_MS` | `21600000` (6h) | Web auto silent sync on Carteira open **only with `sessionReady`** |

### Key files per integration

- **Unimed:** `unimedbh-login.helper.ts`, `unimedbh-sync.scraper.ts`, `unimedbh-cartao-virtual.scraper.ts`
- **Amil:** Amil flow priority: (1) `encrypted_session_token` HTTP-only, (2) `AuthOGS/Login` API, (3) CDP cookie read, (4) CDP fill + in-page API, (5) Playwright. JWT: `objeto.login` (not `marcaOtica`).
- **Hermes Pardini:** `hermes-pardini.portal.ts`, `hermes-pardini-bff.service.ts`, `hermes-pardini-exam-persist.ts`
- **Delta sync:** `sync-delta.helper.ts` — `computeUnimedExtratoMonths`, `computeUnimedAuthorizationSince`, `computeHermesPardiniExamStartDate`

## Neo4j — associations only

Entities and attributes live in **Postgres**; Neo4j stores **associations** between PG IDs (paths, Ava pins, dedup). See `docs/ARCHITECTURE_DATA_LAYERS.md`.

- `NEO4J_SYNC_ENABLED=1` — projects entities, links, lineage (Doctor/Procedure) after sync/import
- `neo4j-lineage-worker` — backfill `import_raw_records`; scripts `npm run neo4j-lineage-worker:once|backfill`
- Read: `GET /patients/:id/graph/clinical-paths`, `/timeline/graph`; UI Timeline → **Encacheamento**
- Migration: `025_neo4j_projection_state.sql`

## Frontend — where to edit

- Patient profile: `packages/web/src/pages/patient/detail.tsx` (tabs **Carteira**, **Convênios**, **Integrações**)
- **Ava global:** `AvaGlobalDock` em `AppLayout.tsx` — orb fixo (FAB) em todas as telas; chat em drawer (`AvaDockWidget`, `AvaChatPanel`); lente de paciente (`useAvaPatientLens`, `AvaPatientLensSelect`); aceleradores G1 (`AvaAcceleratorButton`, `ava-dock-bus.ts`, `entityPin` na API)
- Exam markers dashboard: `ExamMarkersDashboard.tsx`, sub-aba em `ExamsTab.tsx`
- Silent wallet: `useSilentWalletSync.ts`, `useWalletLinkSyncStatus.ts`, `silent-sync.ts`
- Sync modal: `packages/web/src/components/scraper/SyncProgressModal.tsx`
- Link plan: modal in `detail.tsx` + `ImportInsuranceModal.tsx`
- API client: `packages/web/src/lib/api.ts`

**UI grouped lists rule:** new screens with **card/row groups** must keep horizontal alignment between groups. Use `GroupedAlignedTables`, `ALIGNED_COL` (`aligned-table-columns.ts`), `AlignedFieldGrid`. Logos: `packages/web/public/brands/`.

## Migrations

SQL in `database/relational/`. Scripts: `apply-migration-NNN.mjs`. Medidas: **037–038**; emergência: **039**; metering LLM Ava: **040**; pedidos de exame: **041**; higienização: **042** — ver `docs/EMERGENCY.md`, `docs/LLM_USAGE.md`, `docs/DATA_HYGIENE.md`, `docs/EXAM_ARTIFACT_PIPELINE.md`. Orçamento LLM interno (cliente vs interno + teto R$100): **043** — ver `docs/LLM_USAGE.md#custo-cliente-vs-interno-migration-043`. Catálogo semântico dinâmico: **044**. Marcadores de exame (`exam_result_items`): **045**; idempotência + `source_document_id`: **046**. Ava conversas: **047**; pins sessão: **048** — ver `docs/AVA_VISION.md`.

## Legal / LGPD

- Canonical docs: `docs/legal/` (versioned markdown); architecture: `docs/LEGAL_COMPLIANCE.md`.
- `GET /compliance/documents/:kind/current` (public); `POST /compliance/accept` (auth).
- Seed after migration: `node packages/api/scripts/seed-legal-documents.mjs`.
- Production: `COMPLIANCE_GATE_ENABLED=1` in API `.env` (UI `RequireCompliance`).

## Feature reviews (skills)

For tier 2+ features, use skills in `.cursor/skills/aiyracare-*` — see `docs/FEATURE_REVIEW_FRAMEWORK.md`. Orchestrator: `aiyracare-feature-release`. **Don't** run four analyses on every typo — use the tier matrix.

## Cursor hooks + entrega

- Hooks: `.cursor/hooks.json` — auditoria em `docs/dev-audit/`; ver `docs/CURSOR_AGENT_OPS.md`.
- Ciclo merge: `docs/DELIVERY_PIPELINE.md` — tier review → `test:critical` → CI (build API + critical + web).
- Roadmap entrega: épicos `dev-delivery-pipeline`, `prod-run-intelligence`.

## Tests API

```powershell
cd packages/api && npx vitest run
```

Critical tests only: `npm run test:critical` (runs a focused subset).

## Commits / PRs

Only commit or open a PR when the user explicitly asks. Follow PR template in `.github/pull_request_template.md` (tier classification + required reviews).

## Context docs

| Doc | Content |
|-----|---------|
| `docs/AVA_VISION.md` | Global companion, sessions, pins, moonshot |
| `docs/AVA_OPERATIONAL.md` | Fases G1–G4 Ava operacional (aceleradores, ações) |
| `docs/AVA_EXPRESSIONS.md` | Expressões visuais + linha narrativa (nome do cuidador) |
| `docs/AVA_PATIENT_LENS.md` | Lente de paciente, layout conversacional, tokens |
| `docs/ARCHITECTURE_DATA_LAYERS.md` | Postgres entities vs Neo4j associations |
| `docs/DATA_HYGIENE.md` | Dedup (Google Photos style) |
| `docs/CLASSIFICATION_ENGINE.md` | Operator label classification engine |
| `docs/OBSERVABILITY.md` | Proactive monitoring, product_events |
| `docs/roadmap.json` | Epics `ava-*`, `observability-platform`, `data-hygiene-dedup` |
