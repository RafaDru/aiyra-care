# Project Instructions for AI Agents

## What is this project

**AiyraCare** — monorepo `aiyra-care` (`@aiyra-care/*`). Workspace: `%USERPROFILE%\workspace\aiyra-care` — ver [`docs/CURSOR_WORKSPACE.md`](docs/CURSOR_WORKSPACE.md). Stack: Fastify API + React/Vite web + PostgreSQL. Living docs: [`docs/PROJETO.md`](docs/PROJETO.md); decision log: [`docs/HISTORICO.md`](docs/HISTORICO.md).

**Work model (lanes, DoD, Cloud vs notebook):** [`docs/CURSOR_WORK_MODEL.md`](docs/CURSOR_WORK_MODEL.md).

## Context for agents (read first)

Compactação de contexto e waves grandes: seguir **[`docs/AGENT_BOOTSTRAP.md`](docs/AGENT_BOOTSTRAP.md)** (ordem de leitura + ritual de entrega).

| Recurso | Uso |
|---------|-----|
| `GET http://127.0.0.1:3010/project/context` | Snapshot estruturado: domínios, decisões, migrations, catálogo `docs/features/index.json` |
| [`docs/project-context.json`](docs/project-context.json) | Fonte curada (atualizar em mudanças de arquitetura/roadmap) |
| [`docs/DOCUMENTATION_SYSTEM.md`](docs/DOCUMENTATION_SYSTEM.md) | Tiers, feature cards, help |
| [`docs/roadmap.json`](docs/roadmap.json) + `GET /roadmap` | Entrega priorizada |

Detalhe de integrações, env vars, fluxos de sync e schema: **`docs/PROJETO.md`** e cards em **`docs/features/`** — não duplicar tabelas longas aqui.

## Monorepo structure

npm workspaces (`packages/*`, `packages/agents/*`):

| Package | Stack | Purpose |
|---------|-------|---------|
| `packages/api` | Node 22 + Fastify 5 + TypeScript (hexagonal) | Backend |
| `packages/web` | React 19 + Vite 6 + Ant Design 6 | Frontend |
| `packages/connect` | TypeScript + Zod | Canonical connector contract |
| `packages/connect-worker` | TypeScript | Standalone scheduled sync runner |
| `packages/neo4j-lineage-worker` | TypeScript | Neo4j lineage backfill |
| `packages/mobile` | React Native + Expo | Shell Expo — paridade 80/20 com web (`docs/MOBILE_WEB_DUAL_DELIVERY.md`) |
| `packages/agents/*` | Python FastAPI | Agent services (pediatria, integracao, farmaceutico) |

## Starting services

When user says "up", "sobe", "sobe os serviços", or "restart":

```powershell
taskkill /F /IM node.exe 2>&1 | Out-Null
Start-Sleep 2
powershell -File "$env:USERPROFILE\workspace\aiyra-care\scripts\up.ps1" *>$null
```

Always use `*>$null` to suppress output so the chat doesn't get stuck.

**Dev servers:** API http://127.0.0.1:3010/health (`cd packages/api && npm run dev`) · Web http://localhost:5173 (`cd packages/web && npm run dev`) · Logs `api.log` / `web.log` · DB `postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare`

## Build, test, lint

```powershell
cd packages/api && npm run build && npx vitest run
cd packages/web && npm run build
cd packages/connect && npm run typecheck
cd packages/agents/<name> && pip install -r requirements.txt && python -c "from main import app; print('OK')"
```

Root `npm run lint` is a no-op. Ops: `npm run test:ops` · smoke `npm run ops:smoke` · critical subset `npm run test:critical` · runbook [`docs/ops/RUNBOOK_ALERTS.md`](docs/ops/RUNBOOK_ALERTS.md).

## Architecture pointers

**API (hexagonal):** `packages/api` — `domain/` → `application/` → `infrastructure/`. Auth Supabase + escopo paciente: [`docs/SUPABASE.md`](docs/SUPABASE.md). Connect boundary: [`docs/CONNECT.md`](docs/CONNECT.md).

**Sync & portais** (Unimed, Amil, Mater Dei, Hermes, ConecteSUS, Bradesco): tabelas, env vars, delta incremental, SSE — [`docs/PROJETO.md`](docs/PROJETO.md), [`docs/SYNC_DELTA.md`](docs/SYNC_DELTA.md), [`docs/SUS_CONECTESUS.md`](docs/SUS_CONECTESUS.md), [`docs/FLEURY_PRECISION_CARE.md`](docs/FLEURY_PRECISION_CARE.md). Lista de migrations: **`GET /project/context`** ou `database/relational/` + feature docs (ex. [`docs/FAMILY_ACCESS_MODEL.md`](docs/FAMILY_ACCESS_MODEL.md), [`docs/AVA_VISION.md`](docs/AVA_VISION.md)).

**Neo4j (só associações):** [`docs/ARCHITECTURE_DATA_LAYERS.md`](docs/ARCHITECTURE_DATA_LAYERS.md) · worker `neo4j-lineage-worker` · `NEO4J_SYNC_ENABLED=1`.

**Web entry points:** perfil paciente `packages/web/src/pages/patient/detail.tsx` (Carteira, Convênios, Integrações) · Ava global `AppLayout.tsx` · alinhamento de listas `GroupedAlignedTables` / `ALIGNED_COL` · hub UI em [`docs/PROJETO.md`](docs/PROJETO.md).

## Legal / LGPD

[`docs/LEGAL_COMPLIANCE.md`](docs/LEGAL_COMPLIANCE.md) · docs versionados em `docs/legal/` · `GET /compliance/documents/:kind/current` · seed `node packages/api/scripts/seed-legal-documents.mjs` · prod `COMPLIANCE_GATE_ENABLED=1`.

## Delivery, QA, hooks

- Hooks: `.cursor/hooks.json` — [`docs/CURSOR_AGENT_OPS.md`](docs/CURSOR_AGENT_OPS.md)
- QA: [`docs/testing/QA_PROCESS.md`](docs/testing/QA_PROCESS.md) — `npm run qa:run -- --suite <id>` · gate `main`: `qa:run-all -- --lane regression`
- Pipeline / preview / ambientes: [`docs/DELIVERY_PIPELINE.md`](docs/DELIVERY_PIPELINE.md), [`docs/infra/TWO_ENV_MODEL.md`](docs/infra/TWO_ENV_MODEL.md), [`docs/infra/ENVIRONMENTS.md`](docs/infra/ENVIRONMENTS.md)
- Tier 2+ reviews: [`.cursor/skills/aiyracare-feature-release`](.cursor/skills/aiyracare-feature-release/SKILL.md) + [`docs/FEATURE_REVIEW_FRAMEWORK.md`](docs/FEATURE_REVIEW_FRAMEWORK.md)

## Solo operator

One human (Rafael) decides product, architecture, and policy; agents own implementation, PRs, ops, and **merge to `main`** when CI/QA gates pass — [`docs/OPS_SOLO_OPERATOR_CHARTER.md`](docs/OPS_SOLO_OPERATOR_CHARTER.md).

## Commits / PRs

Follow [`.github/pull_request_template.md`](.github/pull_request_template.md) (tier classification) and [`docs/DELIVERY_PIPELINE.md`](docs/DELIVERY_PIPELINE.md). Merge is agentic when gates pass unless Rafael issued an explicit strategic hold.

## More docs

Hub: [`docs/README.md`](docs/README.md) · índice completo via [`docs/AGENT_BOOTSTRAP.md`](docs/AGENT_BOOTSTRAP.md).
