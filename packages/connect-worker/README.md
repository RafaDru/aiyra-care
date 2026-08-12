# @open-health/connect-worker

Processo apartado para **sync agendado** (`trigger=scheduled`) dos `integration_links`.

Scrapers e `IntegrationLinkSyncService` continuam em `packages/api` (migração gradual). O worker só orquestra o batch via Postgres.

## Uso

```bash
# Loop (default 30 min)
cd packages/connect-worker
npm run start

# Um batch e encerra
npm run once
```

## Variáveis

| Variável | Default | Efeito |
|----------|---------|--------|
| `CONNECT_WORKER_INTERVAL_MS` | `SYNC_SCHEDULED_INTERVAL_MS` ou `1800000` | Intervalo do loop |
| `DATABASE_URL` | local `openhealth` | Postgres |
| `CONNECT_WORKER_EXTERNAL=1` | off | Na API, desliga `SYNC_SCHEDULED_INTERVAL_MS` embutido |

Com worker externo, defina na API:

```
SYNC_SCHEDULED_INTERVAL_MS=0
CONNECT_WORKER_EXTERNAL=1
```

E rode `npm run start` neste pacote.

Equivalente legado: `packages/api/scripts/run-scheduled-syncs.mjs`.
