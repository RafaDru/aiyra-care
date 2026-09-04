# Aiyra: Ops — hub da sessão

> **Sessão Cursor:** use este arquivo como ponto de entrada ao trabalhar observabilidade, alertas, suporte e console `:3013`.  
> **Última atualização:** 2026-09-04

Este diretório é a **fonte de verdade operacional** do épico `prod-run-intelligence` e complementa [`docs/OBSERVABILITY.md`](../OBSERVABILITY.md) (visão arquitetural) com runbooks, queries e backlog executável.

---

## Ordem de leitura (agente / humano)

| # | Documento | Quando usar |
|---|-----------|-------------|
| 1 | **Este README** | Contexto da sessão Ops |
| 2 | [`CONSOLE.md`](./CONSOLE.md) | Abas do console `:3013`, o que cada uma mede |
| 3 | [`TELEMETRY.md`](./TELEMETRY.md) | Tabelas PG, LGPD, queries úteis |
| 4 | [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md) | Chamados «Reportar problema» (migration 061) |
| 5 | [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md) | Resposta por tipo de alerta |
| 6 | [`../OPS_FALLBACKS_AND_ALERTS.md`](../OPS_FALLBACKS_AND_ALERTS.md) | Diagramas fallbacks / triagem |

---

## Stack ops (dois ambientes não prod)

| | Integração (dev) | Preview (staging local) |
|---|------------------|-------------------------|
| **API** | `:3010` | `:3020` |
| **Web** | `:5173` | `:5174` |
| **Ops console** | `:3013` | `:3023` |
| **Postgres** | `aiyracare` | `aiyracare_preview` |
| **Chave métricas** | `OPS_METRICS_KEY` integration | `OPS_METRICS_KEY` preview (**distinta**) |

Matriz completa: [`docs/infra/ENVIRONMENTS.md`](../infra/ENVIRONMENTS.md) · [`docs/infra/TWO_ENV_MODEL.md`](../infra/TWO_ENV_MODEL.md).

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

Header API ops: `x-internal-ops-key: $OPS_METRICS_KEY`

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

**Fase atual (MVP):** ingest + bundle técnico no PG. **Próximo na sessão Ops:** fila no console, webhook, triagem por fingerprint.

---

## Backlog ops (prioridade sugerida)

| ID roadmap | Entrega | Status |
|------------|---------|--------|
| `run-support-user-reports` | Chamado LGPD + API + botão | **MVP done** — fila console pendente |
| `run-ops-feature-health-matrix` | Matriz acesso×falha | done |
| `run-dev-audit-bridge` | Bridge dev-audit | done |
| `run-user-escalation` | Sync crítico opt-in | done |
| — | Painel **Suporte** no console (`support_reports` open) | **done** (aba Suporte :3023) |
| — | Webhook `SUPPORT_REPORT_WEBHOOK_URL` | **done** (`support-report-dispatch.ts`) |
| — | Agente investigador → draft PR (Tier 0–1) | **Tier 0** — Cursor Automation + `CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL` · ver [`SUPPORT_INVESTIGATOR_AUTOMATION.md`](./SUPPORT_INVESTIGATOR_AUTOMATION.md) |
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
