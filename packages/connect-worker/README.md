# @aiyra-care/connect-worker

Processo apartado para **sync agendado** (`trigger=scheduled`) dos `integration_links`.

Scrapers e `IntegrationLinkSyncService` continuam em `packages/api` (migração gradual). O worker só orquestra o batch via Postgres.

## Uso

```bash
# Loop (default 30 min)
cd packages/connect-worker
npm run start

# Um batch e encerra
npm run once

# Ops alertas (webhook) — um ciclo
npm run ops-alerts:once

# Relatório semanal de negócio (markdown) — um ciclo
npm run ops-business-weekly:once
```

## Variáveis

| Variável | Default | Efeito |
|----------|---------|--------|
| `CONNECT_WORKER_INTERVAL_MS` | `SYNC_SCHEDULED_INTERVAL_MS` ou `1800000` | Intervalo do loop |
| `DATABASE_URL` | local `aiyracare` | Postgres |
| `CONNECT_WORKER_EXTERNAL=1` | off | Na API, desliga `SYNC_SCHEDULED_INTERVAL_MS` embutido |
| `OPS_ALERTS_INTERVAL_MS` | `0` | Loop de `ops:alerts-check` no mesmo processo (preferido vs API multi-réplica) |
| `OPS_ALERT_WEBHOOK_URL` | — | Slack-compatible; ver `docs/infra/OPS_ALERTS_PRODUCTION.md` |
| `OPS_BUSINESS_WEEKLY_INTERVAL_MS` | `0` | Loop do relatório semanal no mesmo processo (ex. `604800000` = 7 dias) |
| `OPS_WEEKLY_REPORT_WEBHOOK_URL` | — | Resumo Slack-compatible (igual `npm run ops:business-weekly` na raiz) |
| `OPS_BUSINESS_WEEKLY_OUT_DIR` | `docs/ops/reports/` (monorepo) | Diretório de saída do markdown |

Com worker externo, defina na API:

```
SYNC_SCHEDULED_INTERVAL_MS=0
CONNECT_WORKER_EXTERNAL=1
```

E rode `npm run start` neste pacote.

## Cloud Run Job (GCP preview)

Quando o host for GCP, o loop contínuo vira **jobs agendados**:

```bash
CONNECT_WORKER_JOB_MODE=sync|ops|business-weekly npm run job
npm run deploy:preview:worker   # raiz do monorepo
```

Ver `docs/infra/GCP_PREVIEW_RUNBOOK.md` § connect-worker.
