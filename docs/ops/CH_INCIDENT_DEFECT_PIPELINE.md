# CH — Pipeline Incidentes → Triagem → Defeitos → Correção + Lote

**Versão:** 2026-09-24 · **Status:** implementação autorizada (Rafael)  
**Branch:** `cursor/ch-incidentes-board-193e` · PR [#74](https://github.com/RafaDru/aiyra-care/pull/74)

Cópia legível no monorepo da spec técnica (agent store: `docs/ch-incident-defeito-technical-spec.md` no Project Agent Store).

**Referências CH:** [`COMMAND_HUB.md`](./COMMAND_HUB.md) · [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md) · [`INVESTIGATION_CORRELATION.md`](./INVESTIGATION_CORRELATION.md)

---

## 1. Objetivo

Pipeline ops de ponta a ponta:

1. **Incidente** — ingest (app, alerta, job…) + dispatch confiável (outbox).
2. **Triagem** — agente 1 (webhook Cursor) com estados visíveis no CH.
3. **Defeito** — registro pós-triagem, dedup por fingerprint, N incidentes ↔ 1 defeito.
4. **Correção** — agente 2, status até **Pronto para PR**.
5. **Lote CH** — agrupa **somente** defeitos **Pronto para PR** na janela **X horas**.

---

## 2. Máquinas de estado

### 2.1 Incidente (UI CH + PG)

**Coluna canônica:** `ops_analysis_queue.incident_pipeline_status` (migration **075**).

| Status UI (PT) | Valor PG | Entrada típica |
|----------------|----------|----------------|
| **Aberto** | `open` | Insert fila / incidente criado |
| **Encaminhado** | `forwarded` | Webhook investigador HTTP 2xx |
| **Em fila** | `queued_worker` | Worker local claim do outbox |
| **Em triagem** | `in_triage` | Agente 1 iniciou (`investigating`) |
| *(interno)* Triado | `triaged` | Callback triagem + defeito criado/vinculado |
| *(interno)* Descartado | `dismissed` | Triagem descarta |

**Legado `ops_analysis_queue.status`:** mantido (`queued`, `investigating`, `fix_proposed`, …). UI primária usa `incident_pipeline_status` quando presente; fallback: `queued|failed` → Aberto; `investigating|fix_proposed` → Em triagem.

**Transições:** `open → forwarded → queued_worker → in_triage → triaged | dismissed`

### 2.2 Defeito plataforma

**Tabela:** `platform_defects.status` (migration **071**).

| Status UI | Valor PG |
|-----------|----------|
| Aberto | `open` |
| Em correção | `in_fix` |
| Pronto para PR | `ready_for_pr` |
| Corrigido | `fixed` |

`open → in_fix → ready_for_pr → fixed`

**Dedup:** índice parcial único em `fingerprint` onde `status IN ('open','in_fix','ready_for_pr')`.

### 2.3 Lote PR (CH)

**Tabela:** `defect_pr_batches` (**073**). Elegibilidade: `platform_defects.status = 'ready_for_pr' AND pr_batch_id IS NULL`.

**Env:** `OPS_DEFECT_PR_BATCH_INTERVAL_MS` (default 6h).

---

## 3. Schema PostgreSQL (071–075)

| Migration | Conteúdo |
|-----------|----------|
| **071** | `platform_defects` |
| **072** | `platform_defect_incidents` |
| **073** | `defect_pr_batches` + FK `platform_defects.pr_batch_id` |
| **074** | `incident_dispatch_outbox` |
| **075** | `ops_analysis_queue.incident_pipeline_status` |

Aplicar (com `DATABASE_URL` no `.env`):

```bash
node packages/api/scripts/apply-migration-071.mjs
node packages/api/scripts/apply-migration-072.mjs
node packages/api/scripts/apply-migration-073.mjs
node packages/api/scripts/apply-migration-074.mjs
node packages/api/scripts/apply-migration-075.mjs
```

SQL canônico: `database/relational/071_platform_defects.sql` … `075_ops_analysis_queue_incident_pipeline.sql`.

---

## 4. Outbox + worker (fatias E+)

Após enqueue: `INSERT outbox` (`pending`) → tentativa webhook síncrona → `forwarded` se 2xx.

Worker: `CH_INCIDENT_DISPATCH_INTERVAL_MS` (default 30s); `CH_INCIDENT_DISPATCH_WORKER=0` = só API síncrona + linhas outbox.

---

## 5. APIs (roadmap por fatia)

| Fatia | Entrega |
|-------|---------|
| **A** | Migrations + repos PG + testes vitest |
| **B** | `PlatformDefectService` + rotas GET/PATCH ops-console |
| **C** | Callback triagem → defeito + `incident_pipeline_status` |
| **D** | `DefeitosPanel` + nav `defeitos` + UI 4 estados incidente |
| **E** | Outbox write + worker + batch run |

Rotas ops-console planejadas: `/api/platform-defects`, `/api/defect-pr-batches/*`, `GET /api/analysis-queue` com `incidentPipelineStatus`.

---

## 6. Variáveis de ambiente

| Variável | Default | Uso |
|----------|---------|-----|
| `OPS_DEFECT_PR_BATCH_INTERVAL_MS` | 21600000 | Janela lote CH |
| `CH_INCIDENT_DISPATCH_INTERVAL_MS` | 30000 | Worker poll |
| `CH_INCIDENT_DISPATCH_WORKER` | 1 | 0 = só API síncrona |
| `CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_URL` | — | Agente 2 |

---

## 7. Verificação

- `cd packages/api && npx vitest run platform-defect incident-dispatch-outbox incident-pipeline-status`
- `npm run test:ops` (regressão)
- Suite futura: `docs/testing/suites/ops-ch-defeitos.md`

---

## 8. Não escopo v1

Merge automático GitHub no lote; RabbitMQ; board Falhas infra; migrar `support_reports.deployment_*` para defeito.
