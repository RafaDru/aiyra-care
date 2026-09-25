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
| **Falha** | `dispatch_failed` | Outbox `dead` (max tentativas) ou falha do worker com pipeline em dispatch |
| *(interno)* Triado | `triaged` | Callback triagem + defeito criado/vinculado |
| *(interno)* Descartado | `dismissed` | Triagem descarta |

**Canônico «Falha»:** valor PG `dispatch_failed` (migration **076**). Não derivar só do outbox `dead` na UI — o worker / `markDead` grava `dispatch_failed` no incidente para não ficar preso em «Em fila» (`queued_worker`) nem voltar silenciosamente a «Aberto».

**Legado `ops_analysis_queue.status`:** mantido (`queued`, `investigating`, `fix_proposed`, …). UI primária usa `incident_pipeline_status` quando presente; fallback: `queued|failed` → Aberto; `investigating|fix_proposed` → Em triagem.

**Transições:** `open → forwarded → queued_worker → in_triage → triaged | dismissed` · em falha de dispatch: `queued_worker | forwarded → dispatch_failed` (outbox `failed`/`dead` ou `attempt_count` esgotado).

**Nova tentativa (ops):** `POST /api/analysis-queue/:id/retry-dispatch` (ops-console) — idempotente: outbox `dead`/`failed` → `pending` (payload reconstruído), `incident_pipeline_status` → `open`; opcional tick imediato do worker (`runTick: true`). UI: botão só quando `dispatch_failed` (confirmação leve). CLI equivalente: `ch-incident-dispatch-backfill -- --reset-dead` também normaliza `dispatch_failed` → `open` ao resetar outbox.

### 2.2 Anomalias no acionamento agêntico (D1–D13)

Spec completa: [`ch-incident-dispatch-anomaly-signals.md`](./ch-incident-dispatch-anomaly-signals.md).

Cada desvio fora do happy path (`open` → outbox → webhook 2xx → `in_triage` → callback) deve ser **visível no CH** e **auditável** (`last_error` outbox, contexto fila).

| ID | Cenário | Sinalização CH (fatia) |
|----|---------|------------------------|
| **D1** | Webhook não configurado | **Falha** / banner webhook ausente; `skipped:webhook_not_configured` |
| **D2** | Webhook HTTP 4xx/5xx | **Falha** + `last_error` no detalhe Dispatch |
| **D3** | Esgotou tentativas | **Falha** (`dispatch_failed`); banner `dead` count |
| **D4** | Pipeline/outbox inconsistente | Detalhe Dispatch (status mismatch); retry / reset-dead |
| **D5** | Sem outbox (legado) | **Aberto**; banner «abertos >1h sem outbox» |
| **D6** | Dois workers (corrida) | dead em massa; doc um loop (`CH_INCIDENT_DISPATCH_WORKER`) |
| **D7** | Pre-screen dismiss/defer | Não re-dispatch; legado dismissed |
| **D8** | Modo batch suporte | SLA documentado; não é falha de dispatch |
| **D9** | Encaminhado sem agente | *(F4)* tag Atenção SLA |
| **D10** | Em triagem sem callback | *(F4)* tag Atenção SLA |
| **D11** | Callback triagem falhou | `analysisLastError` / logs callback |
| **D12** | Payload/outbox inválido | **Falha**; `unknown_outbox_kind`, etc. no Dispatch |
| **D13** | Re-dispatch indevido `forwarded` | Corrigido (`listPending` só `pending`) |

**Fatias entregues:** F1 Falha+retry (076); **F2** bloco Dispatch no detalhe do incidente (`GET /api/analysis-queue` inclui `dispatch`); **F3** `GET /api/incident-dispatch/health` + banner na tab Incidentes. F4 SLA timers e F5 alertas externos — fora desta fatia.

**Anti-caducidade (2026-09-25):** incidente em `open` não pode ficar indefinidamente sem linha de dispatch retryável. Filas criadas antes da migration **075** / sem `INSERT` na outbox são cobertas por **backfill one-shot** + **reconciliador periódico** (ver §4.1).

**Elegibilidade reconciliação / backfill**

| Critério | Regra |
|----------|--------|
| Pipeline | `incident_pipeline_status = 'open'` apenas |
| Legado | `status NOT IN ('completed', 'dismissed')` |
| Excluídos | `triaged`, `dismissed` no pipeline — **não** re-dispatch |
| Outbox ativo | Não existe linha com `status IN ('pending', 'forwarded', 'claimed')` para o `incident_id` |
| Outbox `dead` (≥ max tentativas) | Pipeline → `dispatch_failed` (UI **Falha**); re-enfileira só via **Nova tentativa** ou `--reset-dead` |
| Outbox `failed` / `dead` abaixo do max | `resetToPending` + payload reconstruído (mesma `idempotency_key`) |

**Idempotência:** `idempotency_key = buildIncidentDispatchIdempotencyKey(incident_id, 'triage_v1')` — `INSERT … ON CONFLICT DO NOTHING`; reconciliador só faz `resetToPending` quando já existe linha não ativa.

**Payload:** reconstruído a partir de `ops_analysis_queue` + fonte (`support_report` via PG; `ops_alert` via `context_snapshot` + `source_id`). Lotes `support_report` (`context_snapshot.batch`) ficam de fora (disparo manual/batch próprio).

**Webhook ausente (`dispatch.outcome === 'skipped'`):** outbox permanece `pending` com `attempt_count++` e `last_error` `skipped:webhook_not_configured` (ou `webhook_key_missing`) — retry no worker; ops deve configurar `CURSOR_*` webhook envs.

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
| **076** | `dispatch_failed` no CHECK de `incident_pipeline_status` |

Aplicar (com `DATABASE_URL` no `.env`):

```bash
node packages/api/scripts/apply-migration-071.mjs
node packages/api/scripts/apply-migration-072.mjs
node packages/api/scripts/apply-migration-073.mjs
node packages/api/scripts/apply-migration-074.mjs
node packages/api/scripts/apply-migration-075.mjs
node packages/api/scripts/apply-migration-076.mjs
```

SQL canônico: `database/relational/071_platform_defects.sql` … `076_incident_pipeline_dispatch_failed.sql`.

---

## 4. Outbox + worker

Após enqueue investigador: `INSERT incident_dispatch_outbox` (`pending`) → webhook síncrono → outbox `forwarded` + `incident_pipeline_status=forwarded` → `in_triage`; falha → outbox permanece `pending` com `attempt_count++`.

**Worker batch:** processa **somente** outbox `pending` (não re-dispara linhas já `forwarded` — evita loop até 40x/dead). Falha do worker ou `markDead` → pipeline `dispatch_failed` (UI **Falha**), não `open` silencioso.

### 4.1 Reconciliação + backfill

| Comando | Uso |
|---------|-----|
| `npm run ch-incident-dispatch-backfill` | **One-shot:** enfileira todos os `open` elegíveis sem outbox ativo (notebook pós-075) |
| `npm run ch-incident-dispatch-backfill -- --reset-dead` | Recoloca outbox `dead` → `pending` (`attempt_count=0`) se o incidente ainda não terminal; aceita pipeline `open` / `forwarded` / `queued_worker` / `dispatch_failed`; normaliza `forwarded`/`queued_worker`/`dispatch_failed` → `open` antes do próximo dispatch |
| `npm run ch-incident-dispatch-backfill -- --limit=100` | Limita varredura |
| `npm run ch-incident-dispatch-worker` | Loop (`CH_INCIDENT_DISPATCH_INTERVAL_MS`, default 30s): reconciliador + outbox batch |
| `npm run ch-incident-dispatch-worker:once` | Um tick (reconcile se intervalo decorrido + batch) |
| Ops-console `:3013` | Mesmo `runWorkerTick` se `CH_INCIDENT_DISPATCH_WORKER≠0` (default ligado) |

**Reconciliador periódico:** em cada `runWorkerTick`, se passou `CH_INCIDENT_RECONCILE_INTERVAL_MS` (default **60s**), varre incidentes `open` com `created_at` anterior a `now − CH_INCIDENT_OPEN_STALE_MS` (default **5 min**) e sem outbox `pending`/`forwarded`/`claimed` — chama a mesma lógica do backfill (`ensureOutboxForQueueRecord`).

**Max tentativas outbox:** 8 → outbox `status=dead` + pipeline `dispatch_failed`, log `[incident-dispatch] outbox dead …`. Recuperação: **Nova tentativa** no CH ou `npm run ch-incident-dispatch-backfill -- --reset-dead` e corrigir `.env` antes de `ch-incident-dispatch-worker:once`.

**Um loop por vez (notebook):** defina `CH_INCIDENT_DISPATCH_WORKER=0` no `.env` do worktree se você usa **só** `npm run ch-incident-dispatch-worker` (CLI). Com worker embutido no ops-console `:3013` (default), **não** rode o CLI em paralelo — dois loops competem no mesmo outbox (`claim`/`queued_worker`).

`CH_INCIDENT_DISPATCH_WORKER=0` — dispatch síncrono na API + outbox rows; **sem** loop no console `:3013`.

**SQL manual (se o script não estiver disponível):**

```sql
UPDATE incident_dispatch_outbox o SET
  status = 'pending', attempt_count = 0, last_error = NULL,
  claimed_at = NULL, forwarded_at = NULL, updated_at = NOW()
FROM ops_analysis_queue q
WHERE o.incident_id = q.id AND o.status = 'dead'
  AND q.incident_pipeline_status NOT IN ('triaged', 'dismissed')
  AND q.status NOT IN ('completed', 'dismissed');
```

**Lote PR:** `POST /api/defect-pr-batches/run` (ops-console) — UI «Rodar lote agora» em Defeitos.

---

## 5. APIs (roadmap por fatia)

| Fatia | Entrega |
|-------|---------|
| **A** | Migrations + repos PG + testes vitest |
| **B** | `PlatformDefectService` + rotas GET/PATCH ops-console + UI 4 estados incidente (**entregue**) |
| **C** | Callback triagem → defeito + `incident_pipeline_status` (**entregue**) |
| **D** | `DefeitosPanel` + nav `defeitos` (**entregue**) |
| **E** | Outbox write + worker + batch run (**entregue**) |

Rotas ops-console: `/api/platform-defects`, `/api/defect-pr-batches/*`, `GET /api/analysis-queue` (com `incidentPipelineStatus` + `dispatch`), `GET /api/incident-dispatch/health`, `POST /api/analysis-queue/:id/retry-dispatch`.

---

## 6. Variáveis de ambiente

| Variável | Default | Uso |
|----------|---------|-----|
| `OPS_DEFECT_PR_BATCH_INTERVAL_MS` | 21600000 | Janela lote CH |
| `CH_INCIDENT_DISPATCH_INTERVAL_MS` | 30000 | Worker poll |
| `CH_INCIDENT_DISPATCH_WORKER` | 1 | 0 = só API síncrona |
| `CH_INCIDENT_RECONCILE_INTERVAL_MS` | 60000 | Mínimo entre varreduras reconciliador no worker |
| `CH_INCIDENT_OPEN_STALE_MS` | 300000 | Idade mínima do incidente `open` para reconciliar (evita corrida com enqueue síncrono) |
| `CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_URL` | — | Agente 2 |

---

## 7. Verificação

- `cd packages/api && npx vitest run platform-defect incident-dispatch-outbox incident-dispatch-reconcile incident-pipeline-status incident-dispatch-display incident-dispatch-health`
- `npm run test:ops` (regressão)
- Suite futura: `docs/testing/suites/ops-ch-defeitos.md`

---

## 8. Não escopo v1

Merge automático GitHub no lote; RabbitMQ; board Falhas infra; migrar `support_reports.deployment_*` para defeito.
