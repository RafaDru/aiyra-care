# Ops alertas em produção

> Complementa `docs/OBSERVABILITY.md` — colocar alertas no ar sem PHI no canal.

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

### 2. Webhook Slack (ou compatível)

1. Slack → **Apps** → **Incoming Webhooks** → criar para canal `#ops-aiyracare` (ou equivalente).
2. No `.env` / secrets do deploy:

```env
OPS_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
OPS_ALERT_COOLDOWN_MS=1800000
OPS_ALERTS_MIN_SEVERITY=critical
```

Payload enviado: `{ "text": "...", "alerts": [...] }` — sem PHI.

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
*/15 * * * * cd /opt/open-health && npm run ops:alerts-check >> /var/log/aiyracare-ops-alerts.log 2>&1
```

### 4. Smoke após deploy

```bash
# CLI (só DB)
npm run ops:metrics
npm run ops:alerts-check

# HTTP (API + chave)
npm run ops:smoke
```

`ops:smoke` valida `/health`, `/ops/metrics` e `/ops/alerts` com `x-internal-ops-key`.

### 5. GCP billing (paralelo)

Alertas de **custo infra** são separados — ver `docs/infra/GCP_BILLING_ALERTS.md`.

## Variáveis de ambiente

| Variável | Default | Efeito |
|----------|---------|--------|
| `OPS_METRICS_KEY` | — | Obrigatório em prod para endpoints ops |
| `OPS_ALERT_WEBHOOK_URL` | — | URL do webhook; sem URL, check só loga JSON |
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
