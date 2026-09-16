# Runbook — alertas ops AiyraCare

> Um bloco por família de alerta. Sem PHI em notificações.  
> Console: `http://127.0.0.1:3013` (prod: URL em `OPS_ALERT_DASHBOARD_URL`).  
> Diagramas: `docs/OPS_FALLBACKS_AND_ALERTS.md`.  
> **Hub sessão Ops:** [`README.md`](./README.md)

## Primeiros 5 minutos (qualquer alerta)

1. Abrir console ops → aba **Infra** ou **Sync** conforme categoria.
2. `npm run ops:triage` (CLI) ou botão **Verificar e acionar** no console.
3. Confirmar se fallback automático já atuou (`GET /account/freshness` → `runtime`).
4. Se **critical** + pager: seguir seção do alerta abaixo.
5. Registrar hora + ação em `docs/HISTORICO.md` se mudança de config/código.

## Comandos úteis

```powershell
npm run ops:triage
npm run ops:metrics
npm run ops:alerts-check
npm run ops:smoke
npm run ops:notifier:simulate -- --scenario=llm_cascade
```

---

## Infra — API

### `infra_api_down` (critical)

| | |
|--|--|
| **O que é** | Sonda `GET /health` falhou (API não responde OK). |
| **Impacto** | App indisponível; leitura degradada D-1 pode acionar. |
| **Verificar** | Console Infra → probe; `curl http://127.0.0.1:3010/health`; logs `api.log`. |
| **Ações** | `scripts/up.ps1` ou reiniciar processo API; checar PG; disco/memória. |
| **Fallback** | `degraded_read` no manifest (banner no app). |
| **Escalar** | Se PG ok mas API down → deploy/config. Se PG down → ver `infra_postgres_down`. |

### `infra_api_slow` (warning)

| | |
|--|--|
| **O que é** | API health > `OPS_PROBE_API_SLOW_MS` (padrão 3000 ms). |
| **Ações** | Console Ava/Sync; queries lentas; Neo4j; scrapers simultâneos. |
| **Pager** | Não (modo `human_required` + severity critical). |

### `infra_postgres_down` (critical)

| | |
|--|--|
| **O que é** | Postgres indisponível na sonda. |
| **Ações** | Serviço PG; `DATABASE_URL`; conexões; disco. |
| **Fallback** | Leitura D-1 se snapshot existir. |
| **Não** | Deploy migration destrutiva sem backup (`docs/infra/BACKUP.md`). |

### `infra_postgres_slow` (warning)

| | |
|--|--|
| **O que é** | Latência PG > `OPS_PROBE_PG_SLOW_MS` (padrão 500 ms). |
| **Ações** | Queries pesadas; sync em massa; índices; `EXPLAIN` em jobs longos. |

### `infra_neo4j_down` (warning)

| | |
|--|--|
| **O que é** | Neo4j indisponível na sonda (quando habilitado). |
| **Impacto** | Timeline Encacheamento degradada; pins PG seguem. |
| **Ações** | `NEO4J_*` env; instância Neo4j; ou `NEO4J_READ_ENABLED=0` temporário. |

### `worker_stale` (critical)

| | |
|--|--|
| **O que é** | Connect-worker sem heartbeat > `OPS_WORKER_STALE_MINUTES` (45 min) ou `OPS_WORKER_MONITOR=1` sem ticks. |
| **Impacto** | Sync agendado e ops probe/alertas no worker parados. |
| **Verificar** | `product_events` evento `ops_worker_tick`; processo worker; logs worker. |
| **Ações** | Reiniciar `packages/connect-worker`; confirmar `OPS_ALERTS_INTERVAL_MS` no worker; `CONNECT_WORKER_EXTERNAL=1` na API. |
| **Prod** | `npm run setup:ops-prod` define monitor + intervalo. |

---

## Sync

### `sync_stuck_<jobId>` (critical)

| | |
|--|--|
| **O que é** | Job `running` > 30 min. |
| **Verificar** | Console Sync → stuck jobs; `sync_jobs` por `job_id`. |
| **Ações** | `npm run reconcile:sync-jobs` ou reconcile no boot API; portal travado (browser/CDP)? |
| **UI** | Integrações → link → Sincronizar (pode pedir login). |
| **Pager** | Sim. |

### `sync_fail_rate_<portalType>` (warning ou critical)

| | |
|--|--|
| **Warning** | 40–69% falha 24h, n≥3 — monitorar no console. |
| **Critical** | ≥70% — pager + **portal pausado** (scheduled off). |
| **Ações** | Console Sync → portal; Integrações → auth_attention; credenciais/sessão. |
| **Portais** | amil, unimed_bh, hermes_pardini, mater_dei, conectesus, etc. |
| **Fallback** | `runtime.portals` pausa scheduled; banner stale Carteira. |
| **Regularizar** | Sync manual OK → aguardar TTL ou limpar degradado em PG `runtime_degraded_state`. |

---

## Ava / LLM

### `llm_cascade_fail` (critical)

| | |
|--|--|
| **O que é** | ≥3 `ava_chat_failed` em 5 min, 0 sucesso. |
| **Fallback** | **Ava lite** automático. |
| **Ações** | `npm run test:smoke:llm`; provedores LLM; quota; `llm_usage_events`; Zen/Gemini keys. |
| **Console** | Aba Ava — provider mix, falhas. |

### `llm_quota_spike` (warning)

| | |
|--|--|
| **O que é** | ≥10 `ava_quota_blocked` em 1 h. |
| **Ações** | Produto/franquia; billing; comunicação família (sem PHI). |
| **Pager** | Não (warning). |

### `internal_llm_budget_exhausted` (warning)

| | |
|--|--|
| **O que é** | Orçamento interno R$100/mês esgotado. |
| **Impacto** | Classificação/higiene sem LLM interno. |
| **Ações** | `npm run llm:internal-usage`; revisar teto migration 043. |

---

## Produto / billing

### `stripe_webhook_failures` (warning ou critical)

| | |
|--|--|
| **O que é** | Falhas de validação em `POST /billing/webhook` (assinatura, body). |
| **Warning** | ≥3 em 1 h. **Critical** | ≥10 em 1 h. |
| **Impacto** | Checkout/assinatura não refletem no app. |
| **Verificar** | Stripe Dashboard → Webhooks; `STRIPE_WEBHOOK_SECRET`; URL pública HTTPS. |
| **Dev** | `scripts/stripe-listen.ps1` + secret local. |
| **Telemetria** | `product_events` `stripe_webhook_rejected`. |
| **Pager** | Critical apenas (severity filter padrão). |

---

## Matriz pager (produção padrão)

| Config | Valor |
|--------|--------|
| `OPS_ALERTS_DISPATCH_MODE` | `human_required` |
| `OPS_ALERTS_MIN_SEVERITY` | `critical` |
| `OPS_ALERT_COOLDOWN_MS` | 1800000 (30 min) |

Warnings aparecem no console; toast só para critical human-required.

---

## Setup produção (Trilha A)

```powershell
npm run setup:ops-prod
# Editar .env: OPS_ALERT_DASHBOARD_URL, OPS_ALERT_WEBHOOK_URL (ntfy/email)
# VM: connect-worker com OPS_ALERTS_INTERVAL_MS=900000
```

Ver: `docs/infra/OPS_ALERTS_PRODUCTION.md`, `docs/infra/OPS_ALERT_CHANNELS.md`.

---

## Referências

- `packages/api/src/domain/ops/ops-alerts.ts` — regras
- `packages/api/src/domain/ops/ops-alert-triage.ts` — triagem
- `docs/OPERATION_MODEL.md` — fases e fallbacks
