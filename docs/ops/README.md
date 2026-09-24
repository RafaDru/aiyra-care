# Aiyra: Ops — hub da sessão

> **Sessão Cursor:** use este arquivo como ponto de entrada ao trabalhar observabilidade, alertas, suporte e console `:3013`.  
> **Última atualização:** 2026-09-23

Este diretório é a **fonte de verdade operacional** do épico `prod-run-intelligence` e complementa [`docs/OBSERVABILITY.md`](../OBSERVABILITY.md) (visão arquitetural) com runbooks, queries e backlog executável.

> **Foco atual (2026-09-23):** Preview/staging **pausado**; Ops em **ambiente único** (integração). Escopo MVP: [`OPS_MVP_SCOPE.md`](./OPS_MVP_SCOPE.md).

---

## Ordem de leitura (agente / humano)

| # | Documento | Quando usar |
|---|-----------|-------------|
| 1 | **Este README** | Contexto da sessão CH |
| 1a | [`COMMAND_HUB.md`](./COMMAND_HUB.md) | Nome, acrônimo, mapa pacotes |
| 1b | [`OPS_MVP_SCOPE.md`](./OPS_MVP_SCOPE.md) | **Escopo MVP** — o que operar agora vs congelado |
| 2 | [`CONSOLE.md`](./CONSOLE.md) | Abas do console `:3013`, o que cada uma mede |
| 3 | [`TELEMETRY.md`](./TELEMETRY.md) | Tabelas PG, LGPD, queries úteis |
| 4 | [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md) | Chamados «Reportar problema» (migration 061) |
| 5 | [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md) | Lanes AiCare Dev + SRE, pilha Issues |
| 6 | [`INVESTIGATION_CORRELATION.md`](./INVESTIGATION_CORRELATION.md) | Chave `investigationId` entre console, toast e Automations |
| 7 | [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md) | Resposta por tipo de alerta |
| 8 | [`../OPS_FALLBACKS_AND_ALERTS.md`](../OPS_FALLBACKS_AND_ALERTS.md) | Diagramas fallbacks / triagem |

---

## Stack ops (fase MVP — integração apenas)

| | Integração (ativo) | Preview (pausado) |
|---|-------------------|-------------------|
| **API** | `:3010` | `:3020` — não ritualizar |
| **Web** | `:5173` | `:5174` |
| **Ops console** | `:3013` | `:3023` |
| **Postgres** | `aiyracare` | `aiyracare_preview` |
| **Chave métricas** | `OPS_METRICS_KEY` (`setup:ops-alerts`) | segunda key — retomar com staging |

Detalhe MVP: [`OPS_MVP_SCOPE.md`](./OPS_MVP_SCOPE.md). Matriz histórica dois ambientes: [`ENVIRONMENTS.md`](../infra/ENVIRONMENTS.md) · [`TWO_ENV_MODEL.md`](../infra/TWO_ENV_MODEL.md).

```powershell
# Console integração
npm run ops:console

# Console preview (PG preview)
$env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
$env:OPS_CONSOLE_PORT = "3023"
$env:DEPLOYMENT_TIER = "preview"
npm run ops:console

# Status geral
npm run env:status
```

---

## Comandos do dia a dia

| Comando | Função |
|---------|--------|
| `npm run ops:metrics` | Snapshot CLI (sync, Ava, alertas) |
| `npm run ops:alerts-check` | Avalia alertas + webhook opcional |
| `npm run ops:triage` | Triagem pager (`human_required` default) |
| `npm run ops:smoke` | Smoke HTTP ops |
| `npm run test:ops` | Suite vitest ops |
| `npm run dev-audit:bridge` | Correlação hooks Cursor × `product_events` |
| `npm run llm:internal-usage` | Orçamento LLM interno (classificador) |
| `npm run ops:business-weekly` | Relatório markdown em `docs/ops/reports/` (API script) |
| `packages/connect-worker` → `npm run ops-business-weekly:once` | Mesmo relatório via worker (cron / job) |

Header API ops: `x-internal-ops-key: $OPS_METRICS_KEY`

### Relatório semanal de negócio (agendamento)

Agregados sem PHI — mesmo conteúdo que `GET /ops/metrics` → `metrics.business`.

| Variável | Default | Efeito |
|----------|---------|--------|
| `OPS_BUSINESS_WEEKLY_INTERVAL_MS` | `0` | No connect-worker contínuo, intervalo do loop (ex. `604800000` = 7 dias) |
| `OPS_WEEKLY_REPORT_WEBHOOK_URL` | — | Slack-compatible (preview das primeiras linhas) |
| `OPS_BUSINESS_WEEKLY_OUT_DIR` | `docs/ops/reports/` | Override do diretório de saída |

**VM / dev (worker contínuo):** `OPS_BUSINESS_WEEKLY_INTERVAL_MS=604800000 npm run connect-worker`

**Cron Linux (segunda 09:00 UTC):**

```cron
0 9 * * 1 cd /opt/aiyra-care/packages/connect-worker && npm run ops-business-weekly:once >> /var/log/aiyracare-business-weekly.log 2>&1
```

**GCP Cloud Run Job:** `CONNECT_WORKER_JOB_MODE=business-weekly npm run job` — em Run, `OPS_BUSINESS_WEEKLY_OUT_DIR=/tmp/reports` se o filesystem for efêmero; confiar no webhook ou artefato externo.

Ver também [`reports/README.md`](./reports/README.md) e [`business-analytics-ops.md`](../features/business-analytics-ops.md).

---

## Pilares de dados (sem PHI por default)

```text
product_events (049)     → comportamento de produto (allowlist)
client_errors (051)      → fingerprint usuário × feature × erro
support_reports (061)    → chamado voluntário + bundle consentido
sync_jobs                → integrações (status, step, error)
llm_usage_events (040+)  → tokens / custo cliente vs interno
sync_escalation_* (056)  → incidentes sync opt-in família
```

Regra LGPD ops: **agregar e diagnosticar**; não exportar prontuário em Slack/webhook. Ver [`TELEMETRY.md`](./TELEMETRY.md).

---

## Console `:3013` — mapa rápido

| Aba | Mede | Fontes PG |
|-----|------|-----------|
| **Visão geral** | Alertas critical, KPIs | `evaluateOpsAlerts`, probe |
| **Issues** | Pilha unificada investigação (`investigationId`) | `ops_analysis_queue` (068) |
| **Produto & UX** | Erros cliente, mapa features, matriz acesso×falha | `client_errors`, `product_events` |
| **Sync** | Jobs, fail rate portal, stuck | `sync_jobs` |
| **Ava & LLM** | Turnos, tokens, cascade, quota | `llm_usage_events`, `product_events` |
| **Infra** | API, Postgres, Neo4j, stack | probe, health |
| **Custo interno** | Classificador, teto R$ | `llm_internal_budget` |

Detalhe: [`CONSOLE.md`](./CONSOLE.md).

---

## Reportar problema (novo — migration 061)

| Item | Valor |
|------|--------|
| **UI** | Botão «Reportar problema» no header do app |
| **API** | `POST /support/reports` |
| **Tabela** | `support_reports` |
| **Telemetria** | `support_report_submitted` |
| **Ops doc** | [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md) |

**Fase atual:** ingest + fila **Issues** + agente Cursor (Tier 0/1) + `investigationId` para correlacionar com Automations.

### Investigador — imediato vs batch (6h)

| Variável | Default | Efeito |
|----------|---------|--------|
| `OPS_SUPPORT_INVESTIGATOR_MODE` | `immediate` | `batch` adia automation automática; toast no POST inalterado |
| `OPS_SUPPORT_INVESTIGATOR_BATCH_INTERVAL_MS` | `21600000` | Agrupa por `(deployment_tier, category)` no connect-worker |

Runbook operacional: [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md) § Suporte — investigador Cursor. Vitest: `support-report-batch.test.ts`.

---

## Backlog ops (prioridade sugerida)

| ID roadmap | Entrega | Status |
|------------|---------|--------|
| `run-support-user-reports` | Chamado LGPD + API + botão | **done** — aba Suporte + Issues + investigationId |
| `run-ops-feature-health-matrix` | Matriz acesso×falha | done |
| `run-dev-audit-bridge` | Bridge dev-audit | done |
| `run-user-escalation` | Sync crítico opt-in | done |
| — | Painel **Suporte** no console (`support_reports` open) | **done** (aba Suporte :3023) |
| — | Webhook `SUPPORT_REPORT_WEBHOOK_URL` | **done** (`support-report-dispatch.ts`) |
| — | Pilha `ops_analysis_queue` + callback | **done** — migration 068 · [`INVESTIGATION_CORRELATION.md`](./INVESTIGATION_CORRELATION.md) |
| — | Agente investigador (Tier 0–1) | **done** — AiCare Dev + SRE · [`SUPPORT_INVESTIGATOR_AUTOMATION.md`](./SUPPORT_INVESTIGATOR_AUTOMATION.md) · [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md) |
| `product-analytics-optin` | Analytics semântico opt-in | P3 — fora do ops imediato |

Atualizar esta tabela ao fechar itens em `docs/roadmap.json` → `prod-run-intelligence`.

---

## Ritual ao entregar na sessão Ops

1. Código em `packages/api` (ops routes, métricas) ou `packages/ops-console`
2. Runbook se novo alerta → [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md)
3. Tabela/query nova → [`TELEMETRY.md`](./TELEMETRY.md)
4. Feature visível → `docs/features/<id>.md` + roadmap
5. Decisão → `docs/HISTORICO.md`

---

## Links externos no repo

| Doc | Conteúdo |
|-----|----------|
| [`docs/OBSERVABILITY.md`](../OBSERVABILITY.md) | Arquitetura observabilidade |
| [`docs/OPERATION_MODEL.md`](../OPERATION_MODEL.md) | Fases L0–L5, fallbacks |
| [`docs/infra/OPS_PREP_CHECKLIST.md`](../infra/OPS_PREP_CHECKLIST.md) | Preparação go-live ops |
| [`docs/infra/OPS_ALERT_CHANNELS.md`](../infra/OPS_ALERT_CHANNELS.md) | Webhook local / Slack |
| [`docs/infra/PREVIEW_LOCAL_TEST_GUIDE.md`](../infra/PREVIEW_LOCAL_TEST_GUIDE.md) | Checklist staging |
| [`docs/dev-audit/README.md`](../dev-audit/README.md) | Auditoria hooks Cursor |

---

## Para agentes Cursor nesta sessão

1. Ler **este README** antes de alterar ops.
2. Não duplicar PHI em logs, webhooks ou artifacts.
3. `npm run test:ops` após mudanças em `packages/api/src/application/ops` ou alertas.
4. Regra opcional no chat: `.cursor/rules/aiyra-ops-session.mdc`
