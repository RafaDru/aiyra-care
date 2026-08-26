# Observabilidade, monitoramento e analytics de produto

> **Última atualização:** 2026-08-18  
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

**Lacuna:** não há **eventos de produto** unificados (cliques, abandono de fluxo, hooks Ava, tempo em tela).

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

- `GET /ops/metrics` — Ava p50/p95 tokens, sync por portal, alertas derivados.
- `GET /ops/alerts` — só alertas ativos.
- Header `x-internal-ops-key` quando `OPS_METRICS_KEY` ou `LLM_INTERNAL_OBSERVABILITY_KEY` definido.
- CLI: `npm run ops:metrics`.

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
| `billing_checkout_started` / `completed` | Conversão |
| `hygiene_prompt_shown` / `resolved` | Dedup |
| `onboarding_step` | Onde trava onboarding |

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
| API down | health fail 2× | e-mail / Slack (futuro) |
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

## Roadmap

Épicos `observability-platform`, `product-analytics-optin` em `docs/roadmap.json`.

## Estado atual

- Telemetria LLM e sync parcial em PG.
- `product_events` + ingest web (Ava, sync terminal, G3).
- Sem alertas automatizados além GCP budget.
- Smoke tests: `test:smoke:llm`, `test:smoke:billing`, `test:critical`.
