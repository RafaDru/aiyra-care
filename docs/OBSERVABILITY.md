# Observabilidade, monitoramento e analytics de produto

> **Última atualização:** 2026-09-04  
> Objetivo: operação **proativa** (antecipar falhas e travamentos), não só reagir a tickets.  
> LGPD: sem PHI em logs agregados; conteúdo clínico/chat só com opt-in explícito.

## Pilares

| Pilar | O que medimos | Onde |
|-------|----------------|------|
| **Saúde do sistema** | API, DB, Neo4j, workers, Stripe webhook | Health, alertas GCP |
| **Operação clínica** | Sync jobs, OCR, LLM cascade failures | `sync_jobs`, `llm_usage_events` |
| **Produto / comportamento** | Onde o usuário trava, abandona, esgota franquia | `product_events` |
| **Custo** | Tokens LLM, créditos, Stripe | `llm_usage_events`, billing |

## Filosofia: proativo vs reativo

```text
Reativo     → usuário reporta "Ava não responde"
Proativo    → alerta: 100% cascade LLM falhou 5 min
              → dashboard: p95 tempo sync Hermes subiu
              → cohort: 40% abandonam checkout plano após quota 80%
```

## O que já existe

| Sinal | Fonte | Uso |
|-------|--------|-----|
| API up | `GET /health`, `GET /health/deep` (Neo4j) | Uptime |
| Sync | `sync_jobs` (status, step, error, novelty) | Diagnóstico integrações |
| LLM | `llm_usage_events` (feature, tokens, provider, metadata) | Custo, falhas Ava |
| Créditos | `handwriting_credit_events` | Manuscrito |
| Billing | `billing_purchases`, Stripe Dashboard | Receita |
| Logs locais | `api.log`, `web.log` | Dev |
| GCP budgets | `docs/infra/GCP_BILLING_ALERTS.md` | Infra |

**Lacuna (ver `docs/OPERATION_MODEL.md`):** degradação p95 baseline, proativo usuário (Fase 5). **Fallbacks:** migration 052 + `runtime` em `/account/freshness`; `npm run ops:degraded-snapshot`.

## Modelo operacional ampliado

Decisões de desenho (observação ativa, cache por geração, fallbacks, escalação automação → LLM → humano): **`docs/OPERATION_MODEL.md`**.

## Camada `product_events` (migration 049)

```sql
product_events (
  id UUID,
  account_id UUID NULL,
  session_id VARCHAR(64),
  event_name VARCHAR(64),
  route VARCHAR(128),
  patient_id UUID NULL,
  properties JSONB,
  created_at TIMESTAMPTZ
)
```

**API:** `POST /telemetry/events` (auth) — batch até 25 eventos; allowlist de `event_name` e chaves em `properties` (`product-event.ts`).

**Web:** `trackProductEvent(name, props, { patientId })` em `packages/web/src/lib/product-events.ts`.

### Métricas ops

- `GET /ops/metrics` — Ava p50/p95 tokens, sync por portal, alertas derivados (workers/CLI; **não** é o dashboard).
- `GET /ops/alerts` — só alertas ativos.
- **Dashboard dev:** `http://127.0.0.1:3013` — `packages/ops-console` (PG direto, independente do app); ver `docs/infra/OPS_ALERT_CHANNELS.md`.
- Header `x-internal-ops-key` quando `OPS_METRICS_KEY` ou `LLM_INTERNAL_OBSERVABILITY_KEY` definido.
- CLI: `npm run ops:metrics`.

### Ops nos dois ambientes não prod

Paridade de **capacidades** (health, métricas, alertas, `product_events`), com **isolamento** de keys, URLs e webhooks:

| Capacidade | Ambiente 1 — Integração | Ambiente 2 — Preview |
|------------|-------------------------|----------------------|
| Health | `GET /health`, `/health/db` (local `3010`) | URL preview + probe gate |
| Métricas / alertas | `OPS_METRICS_KEY` integration | `OPS_METRICS_KEY` preview (distinto) |
| Webhook alertas | Opcional / canal `#dev` | Recomendado — canal preview |
| Connect worker | Opcional local | **Obrigatório** (`CONNECT_WORKER_EXTERNAL=1` na API) |
| Ops console | `localhost:3013` → PG local | Instância apontando PG preview |
| Probe pré-uso | `staging:probe-gate` após mudança relevante | Obrigatório post-deploy |
| `product_events` | Sim | Sim — cohorts separados |

Processo: [`infra/TWO_ENV_MODEL.md`](./infra/TWO_ENV_MODEL.md) · deploy Preview: [`infra/ENV_PREVIEW.md`](./infra/ENV_PREVIEW.md).

**Regras de `properties`:**

- ✅ duração, contagem, feature flags, error codes, `conversation_id`
- ❌ mensagem Ava, OCR text, credenciais, tokens de API

### Eventos prioritários (MVP)

| `event_name` | Objetivo |
|--------------|----------|
| `ava_chat_started` / `completed` / `failed` | Latência, erro LLM |
| `ava_quota_blocked` | Precificação / franquia |
| `ava_context_pin` / `unpin` | Uso do painel |
| `ava_patient_switch_hook` | UX multi-filho |
| `sync_job_terminal` | success/fail por portal |
| `sync_job_started` | Início manual/silent; `skipped` + `reason` quando API ignora |
| `app_screen_viewed` | Uma vez por sessão/tela — alimenta matriz acesso × fail rate |
| `family_invite_*` | Criar, aceitar, revogar, falha (sem e-mail no payload) |
| `patient_access_revoked` | Titular revoga grant no perfil |
| `compliance_gate_redirect` / `compliance_accepted` | Gate legal |
| `notification_optin_changed` | Opt-in escalação sync (settings) |
| `billing_checkout_started` / `completed` | Conversão |
| `hygiene_prompt_shown` / `resolved` | Dedup (API + futura UI) |
| `onboarding_step` | Onde trava onboarding |

**Alertas externos:** webhook plugável (`OPS_ALERT_WEBHOOK_URL`) — local notifier, ntfy, e-mail, Slack · `npm run ops:alerts-check` · ver `docs/infra/OPS_ALERT_CHANNELS.md`.

**Produção:** `docs/infra/OPS_ALERTS_PRODUCTION.md` · setup `npm run setup:ops-alerts` · smoke `npm run ops:smoke` · console ops (URL dedicada, não `/ops` no app).

**Hub operacional (sessão Cursor «Aiyra: Ops»):** [`docs/ops/README.md`](./ops/README.md) · console [`docs/ops/CONSOLE.md`](./ops/CONSOLE.md) · telemetria [`docs/ops/TELEMETRY.md`](./ops/TELEMETRY.md) · suporte [`docs/ops/SUPPORT_REPORTS.md`](./ops/SUPPORT_REPORTS.md).

**Fingerprints:** `errorFingerprints24h` em `GET /ops/metrics` — agrupa `product_events` por erro/status (24h).

Web: helper `trackProductEvent(name, props)` → `POST /telemetry/events` (auth) ou batch.

## Analytics semântico (opt-in separado)

Não é observabilidade operacional — é **pesquisa de produto**:

- Job batch (contas com `analytics_opt_in`): NLP resume conversas → tags em Neo4j (`:Topic`) **sem** expor usuário em dashboard público.
- Agregados: “% conversas preparação consulta”, “temas após sync de exames”.
- Ver roadmap `product-analytics-optin`.

Distinto de:

- `allowLlmDataSharing` (Zen/OpenCode provedor externo).
- Logs de infra (sem conteúdo).

## Monitoramento ativo (alertas)

| Alerta | Condição | Canal |
|--------|----------|-------|
| API down | health fail 2× | webhook ops / dashboard `/ops` |
| LLM cascade total | N falhas `ava_chat` sem sucesso | log + alerta |
| Sync stuck | job `running` > timeout PG registry | já: heartbeat sync |
| Neo4j read fail | deep health | degradar grafo UI |
| Quota spike | muitos `402 LLM_QUOTA` | produto |
| Stripe webhook | falhas repetidas | billing |

Implementação incremental:

1. Scripts cron / worker lê PG e emite métricas — `npm run ops:metrics`.
2. `GET /ops/metrics` e `GET /ops/alerts` (header `x-internal-ops-key` = `OPS_METRICS_KEY` ou `LLM_INTERNAL_OBSERVABILITY_KEY`).
3. Depois: Grafana / Better Stack.

## LLM interno (custo operacional) — indicadores

Metering separado do cliente em `llm_usage_events` (`cost_bucket=internal`) + `llm_internal_budget`.

| Indicador | Query/fonte | O que alerta |
|-----------|-------------|--------------|
| Orçamento interno R$/mês | `GET /llm/usage/internal` · `llm_internal_budget` | teto esgotado → classificação cai p/ regras (sem LLM) |
| Chamadas de classificação | `feature=label_classification AND cost_bucket=internal` | volume das operações |
| Resolvidos via LLM vs fallback local | `metadata.outcome='local_fallback'` | eficiência do novo motor |
| Bloqueados pelo teto | `metadata.outcome='budget_exhausted'` | pico de custo / teto baixo |
| Custo por provedor/modelo | `SUM(estimated_cost_cents)` agrupado | roteamento (Zen free → Go → Gemini) |

```bash
npm run llm:internal-usage      # relatório mensal
npm run llm:internal-usage:top  # + por provedor/modelo
```

## Autonomia e recuperação

| Componente | Recuperação |
|------------|-------------|
| Sync jobs | SSE + reconciliação heartbeat; `sync-browser-registry` timeout |
| Neo4j | `neo4j-lineage-worker:backfill`; app degrada sem grafo |
| LLM | Cascata multi-provider; smoke `npm run test:smoke:llm` |
| Créditos | Reset mensal por `monthly_period` |
| Conta | `DELETE /auth/account` cascade documentado |

Runbook (expandir): `docs/GO_LIVE_TECHNICAL_READINESS.md` + seção ops neste doc.

## Proteção de dados sensíveis

| Camada | Prática |
|--------|---------|
| Logs API | Fastify/pino — `log-sanitization.ts`: redact + serializers sem body; rotas sensíveis marcadas |
| `product_events` | allowlist de keys em `properties` |
| `llm_usage_events.metadata` | reflexão ok; sem prompt completo |
| Export ops | só `BILLING_EXPORT_ACCOUNT_IDS` |
| Neo4j analytics | nós Topic agregados, não texto bruto |

## Dashboards desejados (fase 2)

1. **Operações** — sync por portal, erro rate, duração p95.
2. **Ava** — turnos/dia, tokens p50/p95, provider mix, quota blocked.
3. **Produto** — funil plano, higienização pendente, retenção conversas.
4. **Custo** — tokens × provedor × tier (estimado).

**Console ops (`packages/ops-console`, :3013)** — layout com abas, tokens AiyraCare, gráficos Recharts (`timeSeries24h`: sync, Ava, erros cliente) e uso da largura total da tela.

### Contextos de observabilidade (layout do console)

| Seção | O que mede | Fontes |
|-------|------------|--------|
| **Infra** | API, Postgres, Neo4j, stack local | `ops:probe`, controles start/stop |
| **Produto & UX** | Erros de UI/API, mapa de features, acesso vs falha | `client_errors`, `product_events` + catálogo humanizado |
| **Sync & integrações** | Jobs, fail rate por portal, stuck | `sync_jobs`, alertas derivados |
| **Ava & LLM** | Turnos, tokens, cascade, quota | `llm_usage_events`, `product_events` |
| **Custo interno** | Classificador/higiene, orçamento R$ | `llm_usage_events` internal |

**Erros cliente:** catálogo em `packages/api/src/domain/ops/ops-feature-catalog.ts` (labels PT + área); matriz **Saúde por feature** no console cruza `product_events` (sessões/eventos 24h) com `client_errors` → fail rate e sinal (`hot`, `errors_only`, etc.). Agregação: `buildFeatureHealthMatrix` em `ops-feature-health.ts`.

## Roadmap

Épicos `observability-platform`, `product-analytics-optin` em `docs/roadmap.json`.

## Estado atual

- `product_events` + ingest web/API (Ava, sync, billing, onboarding, higiene).
- Dispatch webhook com triagem: `human_required` default (`OPS_ALERTS_DISPATCH_MODE`); CLI `npm run ops:triage`.
- Auth ops: `OPS_METRICS_KEY` + header `x-internal-ops-key` (sem JWT).
- Agendamento: connect-worker, Task Scheduler (`setup-ops-alerts.ps1`), ou cron Linux.
- Logs sanitizados (Pino redact).
- GCP billing budgets: `docs/infra/GCP_BILLING_ALERTS.md`.
- Smoke: `npm run ops:smoke`, `OPS_SMOKE_FULL=1` (console + notificador), `npm run test:ops`, `test:smoke:llm`, `test:smoke:billing`, `test:critical`.
- Diagramas alertas/fallbacks: `docs/OPS_FALLBACKS_AND_ALERTS.md`.
- Runbook operacional: `docs/ops/RUNBOOK_ALERTS.md`.
- Checklist preparação: `docs/infra/OPS_PREP_CHECKLIST.md`.
- Console ops `:3013`: seções por contexto, mapa de features, matriz acesso×falha (`run-ops-console-sections`, `run-ops-feature-catalog`, `run-ops-feature-health-matrix` done).
