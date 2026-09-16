# Telemetria e analytics — visão Ops

> Complemento operacional de [`docs/OBSERVABILITY.md`](../OBSERVABILITY.md).  
> Foco: **o que consultar**, **o que não expor**, **queries prontas**.

## Princípio LGPD (ops)

| Pode | Não pode |
|------|----------|
| Contagens, fingerprints, rotas, `error_code` | Texto de exame, mensagem Ava, OCR |
| `account_id` para suporte **com base legal** (ticket + opt-in) | Dump de `patients` / `exams` em Slack |
| Agregados k≥20 para produto | Identificar indivíduo em dashboard público |

Três camadas:

1. **Passiva** — `product_events` + `client_errors` (sempre ativa, sem PHI)
2. **Voluntária** — `support_reports` (consentimento granular)
3. **Clínica** — Postgres app — **só via produto/ACL**, não duplicar em ops

---

## `product_events` (049)

**Ingest:** `POST /telemetry/events` (auth) · landing pública: `landing_*` only.

**Eventos relevantes ops:**

| `event_name` | Uso ops |
|--------------|---------|
| `ava_chat_started/completed/failed` | Saúde Ava |
| `ava_quota_blocked` | Franquia / billing |
| `sync_job_terminal` | Pós-sync |
| `sync_escalation_opened/resolved` | Escalação família |
| `support_report_submitted` | Novo chamado |
| `onboarding_step` | Funil cadastro |

```sql
-- Top eventos 24h
SELECT event_name, COUNT(*) AS n
FROM product_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY n DESC
LIMIT 20;

-- Falhas Ava 5m (alerta cascade)
SELECT COUNT(*) FILTER (WHERE event_name = 'ava_chat_failed') AS failed,
       COUNT(*) FILTER (WHERE event_name = 'ava_chat_completed') AS ok
FROM product_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND event_name IN ('ava_chat_failed', 'ava_chat_completed');
```

**Allowlist `properties`:** ver `packages/api/src/domain/telemetry/product-event.ts`.

---

## `client_errors` (051)

**Ingest:** automático via `AppErrorBoundary` + interceptor `api.ts`.

**Dimensões:** fingerprint (16 chars) = hash(feature + kind + code).

```sql
-- Top fingerprints 24h (espelha GET /ops/metrics)
SELECT fingerprint, feature, error_kind, error_code, COUNT(*) AS n,
       MAX(created_at) AS last_seen
FROM client_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2, 3, 4
ORDER BY n DESC
LIMIT 15;

-- Erros de uma rota
SELECT feature, error_code, route, created_at
FROM client_errors
WHERE route LIKE '/patients/%'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;
```

**Matriz no console:** `product_events` (acesso) × `client_errors` (falha) → `ops-feature-health.ts`.

---

## `support_reports` (061)

Ver runbook dedicado: [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md).

---

## `sync_jobs`

```sql
-- Fail rate por portal 24h
SELECT portal_type,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
       COUNT(*) AS total
FROM sync_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1;

-- Jobs stuck (running > 30 min)
SELECT id, portal_type, step, started_at, updated_at
FROM sync_jobs
WHERE status = 'running'
  AND updated_at < NOW() - INTERVAL '30 minutes';
```

---

## `llm_usage_events`

```sql
-- Ava tokens 24h por provider
SELECT provider, model,
       SUM(tokens_total) AS tokens,
       COUNT(*) AS calls
FROM llm_usage_events
WHERE feature = 'ava_chat'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2;

-- Interno (classificador)
SELECT COUNT(*), SUM(estimated_cost_cents)
FROM llm_usage_events
WHERE cost_bucket = 'internal'
  AND created_at > NOW() - DATE_TRUNC('month', NOW());
```

---

## Bridge dev-audit (staging / dev)

Correlaciona edições Cursor com `product_events` **sem PHI**:

```powershell
npm run dev-audit:bridge
# saída: packages/api/scripts/output/dev-audit-bridge-last.json
```

API: `GET /ops/dev-audit-bridge?hours=24` (header ops key).

---

## Ambientes isolados

| PG | Uso |
|----|-----|
| `aiyracare` | Integração |
| `aiyracare_preview` | Staging local |

**Não** misturar cohorts ao analisar métricas. Seed sintético: marker `staging-volume-seed` em alguns ambientes.

---

## O que está planeado (não implementado)

| Épico | Conteúdo |
|-------|----------|
| `product-analytics-optin` | NLP batch + Neo4j `:Topic` — **opt-in separado** |
| Console aba Suporte | Fila `support_reports` |
| Retention job | Purge `product_events` / `client_errors` > 90d |
