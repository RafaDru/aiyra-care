# Ops — setup por ambiente (Integração vs Preview vs Prod)

> Complementa [`TWO_ENV_MODEL.md`](./TWO_ENV_MODEL.md) e a Trilha A (`run-ops-prod-channel`).  
> **Não misturar** keys, webhooks nem `DATABASE_URL` entre camadas.

## Mapa rápido

| Camada | Script setup | Worker monitor | Webhook típico | Console |
|--------|--------------|----------------|----------------|---------|
| **Ambiente 1 — Integração** | `npm run setup:ops-alerts` | **Não** (`OPS_WORKER_MONITOR=0`) | Local `:3012` ou off | `localhost:3013` → PG local |
| **Ambiente 2 — Preview** | `npm run setup:ops-preview` | **Sim** (`OPS_WORKER_MONITOR=1`) | ntfy topic `aiyracare-preview` | URL preview `:3013` |
| **Produção** | `npm run setup:ops-prod` | **Sim** | ntfy / e-mail prod | URL ops restrita |

## Ambiente 1 — Integração (dev + agentes)

**Objetivo:** validar código e gates; pager opcional.

```powershell
npm run setup:ops-alerts
# NÃO rodar setup:ops-prod nem setup:ops-preview aqui
```

| Variável | Valor típico |
|----------|----------------|
| `OPS_WORKER_MONITOR` | `0` ou unset — evita alerta `worker_stale` sem worker |
| `CONNECT_WORKER_EXTERNAL` | `0` (loop na API) ou `1` se worker local |
| `OPS_ALERTS_INTERVAL_MS` | `0` na API; `900000` só se worker rodando |
| `OPS_METRICS_KEY` | integration (único) |
| `OPS_ALERT_WEBHOOK_URL` | `http://127.0.0.1:3012/ops-alert` |

**Gates:** `npm run promotion:gates` inclui `test:ops` + smoke sem HTTP.

**Conflito com Preview na mesma máquina:** se Preview também usa `3012/3013`, subir Integração com ports diferentes:

```env
OPS_CONSOLE_PORT=3014
OPS_LOCAL_NOTIFIER_PORT=3015
```

## Ambiente 2 — Preview estável

**Objetivo:** Rafael testa; ops espelha prod com dados sintéticos.

```powershell
npm run setup:ops-preview   # opcional local
npm run up:preview            # PG aiyracare_preview + stack :3020/:5174/:3023
```

| Variável | Valor típico (local) |
|----------|----------------------|
| `OPS_WORKER_MONITOR` | `1` se worker rodando |
| `CONNECT_WORKER_EXTERNAL` | `1` na API preview se testar sync |
| `OPS_ALERTS_INTERVAL_MS` | `900000` no **connect-worker** |
| `OPS_METRICS_KEY` | **distinto** do integration |
| `API_PUBLIC_URL` | `http://127.0.0.1:3020` |
| `DATABASE_URL` | `.../aiyracare_preview` |

**Promoção local (fase atual):**

```powershell
npm run up:preview
npm run preview:post-deploy
```

Workflow cloud: `.github/workflows/promote-preview.yml` + [`DEPLOY_PREVIEW.md`](./DEPLOY_PREVIEW.md).

## Produção

```powershell
npm run setup:ops-prod
```

Usar apenas quando host prod existir. **Não** reutilizar keys do Preview.

## O que a Trilha A já entregou (código)

| Item | Onde |
|------|------|
| `worker_stale` + `stripe_webhook_failures` | `ops-alerts.ts` |
| Heartbeat worker | `ops_worker_tick` no connect-worker |
| `test:ops` + CI | `ci.yml` |
| Runbook | `docs/ops/RUNBOOK_ALERTS.md` |

## Isolamento de dados ops

- Métricas leem **o PG da `DATABASE_URL` ativa** — console ops no Preview deve apontar ao PG preview, não ao local.
- `product_events` / `client_errors` são **por instância PG** — não há mistura se URLs distintas.
- Artefatos locais (`ops-probe-last.json`) são **por máquina** — em host dedicado, um processo API/worker por ambiente.

## Checklist — não bagunçar sessões

| ✅ Fazer | ❌ Evitar |
|----------|-----------|
| Keys diferentes integration / preview / prod | Copiar `OPS_METRICS_KEY` entre ambientes |
| `setup:ops-preview` só no host Preview | `setup:ops-prod` no `.env` local de integração |
| `OPS_WORKER_MONITOR=1` só com worker rodando | Monitor=1 sem connect-worker (pager falso) |
| Promover Preview só após `promotion:gates` | Deploy Preview direto da branch quebrada |
| Features em `packages/api`, ops em `domain/ops` | Mesmo PR gigante ops + feature sem tier |

## Referências

- [`ENV_INTEGRATION.md`](./ENV_INTEGRATION.md) · [`ENV_PREVIEW.md`](./ENV_PREVIEW.md)
- [`OPS_ALERT_CHANNELS.md`](./OPS_ALERT_CHANNELS.md) · [`RUNBOOK_ALERTS.md`](../ops/RUNBOOK_ALERTS.md)
