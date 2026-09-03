# Ops alertas em produção

> Complementa `docs/OBSERVABILITY.md` — colocar alertas no ar sem PHI no canal.
> **Canais (local vs cloud, sem Slack):** `docs/infra/OPS_ALERT_CHANNELS.md`

## Checklist (≈20 min)

### 1. Chave interna

```powershell
npm run setup:ops-alerts
```

Gera `OPS_METRICS_KEY` no `.env` (64 hex). Protege:

- `GET /ops/metrics`
- `GET /ops/alerts`
- `POST /ops/alerts/check`

Com a chave no header `x-internal-ops-key`, **não** é necessário JWT Supabase.

### 2. Canal de acionamento (webhook genérico)

Slack é **opcional**. O dispatch envia `{ text, alerts, dashboardUrl }` a qualquer URL HTTP.

**Dev (máquina local):** `up.ps1` sobe `ops-local-notifier` e define:

```env
OPS_ALERT_WEBHOOK_URL=http://127.0.0.1:3012/ops-alert
OPS_ALERT_DASHBOARD_URL=http://localhost:5173/ops
```

**Prod:** ntfy, e-mail via Cloud Function, ou outro webhook — ver `OPS_ALERT_CHANNELS.md`.

Slack (se quiser):

1. Slack → **Apps** → **Incoming Webhooks** → canal `#ops-aiyracare`.
2. Secrets do deploy:

```env
OPS_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
OPS_ALERT_DASHBOARD_URL=https://app.example.com/ops
OPS_ALERT_COOLDOWN_MS=1800000
OPS_ALERTS_MIN_SEVERITY=critical
```

Payload: `{ "text": "...", "alerts": [...], "dashboardUrl": "..." }` — sem PHI.

### 3. Agendamento (escolha **uma** opção)

| Opção | Quando usar | Config |
|-------|-------------|--------|
| **A. connect-worker** | VM com worker de sync já rodando | `OPS_ALERTS_INTERVAL_MS=900000` (15 min) no mesmo processo |
| **B. Task Scheduler (Windows)** | Dev/staging local ou VM Windows | `npm run setup:ops-alerts -- -RegisterScheduledTask` |
| **C. Cron Linux / Cloud Scheduler** | GCP, VPS Linux | `*/15 * * * * cd /app && npm run ops:alerts-check` |
| **D. API loop** | **Evitar** se API tem múltiplas réplicas | `OPS_ALERTS_INTERVAL_MS` duplica alertas (cooldown por processo) |

**Recomendado em produção:** connect-worker **ou** cron externo (A/C), **não** loop na API escalada.

```powershell
# Windows — tarefa cada 15 min
powershell -File scripts/setup-ops-alerts.ps1 -RegisterScheduledTask -IntervalMinutes 15
```

```bash
# Linux cron exemplo
*/15 * * * * cd /opt/aiyra-care && npm run ops:alerts-check >> /var/log/aiyracare-ops-alerts.log 2>&1
```

### 4. Smoke após deploy

```bash
# CLI (só DB)
npm run ops:metrics
npm run ops:alerts-check

# HTTP (API + chave)
npm run ops:smoke

# Template produção (ntfy + worker monitor)
npm run setup:ops-prod
```

Runbook por alerta: `docs/ops/RUNBOOK_ALERTS.md`.

`ops:smoke` valida `/health`, `/ops/metrics` e `/ops/alerts` com `x-internal-ops-key`.

### 5. GCP billing (paralelo)

Alertas de **custo infra** são separados — ver `docs/infra/GCP_BILLING_ALERTS.md`.

## Variáveis de ambiente

| Variável | Default | Efeito |
|----------|---------|--------|
| `OPS_METRICS_KEY` | — | Obrigatório em prod para endpoints ops |
| `OPS_ALERT_WEBHOOK_URL` | — | URL POST JSON; local notifier, ntfy, Slack, etc. |
| `OPS_ALERT_DASHBOARD_URL` | — | Link no payload (toast/email); default `LANDING_CAPTURE_WEB_URL/ops` |
| `OPS_LOCAL_NOTIFIER_PORT` | `3012` | Porta do listener local (`ops-local-notifier.mjs`) |
| `OPS_ALERT_COOLDOWN_MS` | `1800000` | Não reenvia mesmo `alert.id` antes do cooldown |
| `OPS_ALERTS_MIN_SEVERITY` | `critical` | `warning` inclui alertas de aviso |
| `OPS_ALERTS_INTERVAL_MS` | `0` | Loop no connect-worker (ou API se única instância) |
| `API_PUBLIC_URL` | `http://127.0.0.1:3010` | Base para `ops:smoke` |

## Teste manual do webhook

Com API/DB local e webhook real (cuidado: mensagem no Slack):

```powershell
# Forçar alerta fictício: sync stuck no PG ou aguardar condição real
npm run ops:alerts-check
```

Resposta esperada:

```json
{
  "checkedAt": "...",
  "alertCount": N,
  "dispatched": true,
  "webhookConfigured": true
}
```

## Runbook

| Alerta | Ação |
|--------|------|
| `sync_stuck_*` | Ver job em `sync_jobs`; portal session; `GET /integration-links/:id/sync-status` |
| `sync_fail_rate_*` | Portal WAF/sessão; logs sanitizados API |
| `llm_cascade_fail` | `npm run test:smoke:llm`; provedores Zen/Go/Gemini |
| `llm_quota_spike` | Franquia; conversão billing |
| `llm_internal_budget` | `npm run llm:internal-usage` |

Fingerprints: `GET /ops/alerts` → `errorFingerprints24h`.
