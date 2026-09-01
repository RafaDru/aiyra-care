# Canais de acionamento ops (local vs cloud)

> Complementa `docs/infra/OPS_ALERTS_PRODUCTION.md` — **detecção** é igual em todos os ambientes; o **transporte** muda.

## Pipeline (sempre igual)

```text
connect-worker / cron / ops:alerts-check
  → ops:probe (health + PG latency)
  → evaluateOpsAlerts + GET /ops/metrics
  → applyFromOps (modo degradado)
  → OpsAlertDispatchService.checkAndDispatch()
  → artefato packages/api/scripts/output/ops-metrics-last.json
```

## Contrato do dispatch

`POST` ao destino configurado em `OPS_ALERT_WEBHOOK_URL` com JSON:

```json
{
  "text": "AiyraCare ops — 2 alerta(s)\n• [critical] sync: ...",
  "alerts": [ { "id": "...", "severity": "critical", "category": "sync", "message": "..." } ],
  "checkedAt": "2026-09-01T12:00:00.000Z",
  "dashboardUrl": "http://localhost:5173/ops"
}
```

Sem PHI. `dashboardUrl` vem de `OPS_ALERT_DASHBOARD_URL` ou deriva de `LANDING_CAPTURE_WEB_URL` + `/ops`.

## Dev — sua máquina (sem Slack)

| Componente | Função |
|------------|--------|
| `scripts/ops-local-notifier.mjs` | Listener `127.0.0.1:3012/ops-alert` |
| `scripts/ops-local-toast.ps1` | Toast Windows (balloon) |
| `scripts/up.ps1` | Sobe notifier + defaults de webhook/dashboard |
| `http://localhost:5173/ops` | Dashboard web (alertas, probe, fingerprints) |

`.env` recomendado (ou defaults do `up.ps1`):

```env
OPS_ALERT_WEBHOOK_URL=http://127.0.0.1:3012/ops-alert
OPS_ALERT_DASHBOARD_URL=http://localhost:5173/ops
OPS_METRICS_KEY=...   # npm run setup:ops-alerts
```

No dashboard, salve a chave em `localStorage` ou use `VITE_OPS_METRICS_KEY` só em dev.

Fluxo quando algo crítico ocorre:

1. `npm run ops:alerts-check` (ou loop no connect-worker)
2. Toast na área de trabalho + browser abre `/ops`
3. Você investiga no painel (sem depender de Slack)

## Cloud — produção

O notificador local **não roda na VM**. O elo precisa ser **alcançável fora do servidor**:

| Canal | Quando usar | Config |
|-------|-------------|--------|
| **Dashboard `/ops`** | Sempre — estado ao abrir a URL de prod | `OPS_ALERT_DASHBOARD_URL=https://app…/ops` |
| **ntfy / Gotify / Telegram** | Push no celular, sem Slack | `OPS_ALERT_WEBHOOK_URL=https://ntfy.sh/aiyracare-ops` |
| **E-mail ops** | Simples, notificação no celular via email | Webhook → Cloud Function que envia email genérico |
| **GCP Monitoring** | Paralelo: `/health` down, billing | `docs/infra/GCP_BILLING_ALERTS.md` |

Agendamento em cloud (escolha uma):

- **connect-worker** na VM com `OPS_ALERTS_INTERVAL_MS=900000`
- **Cloud Scheduler** → `npm run ops:alerts-check` ou `POST /ops/alerts/check` com `x-internal-ops-key`

`OPS_METRICS_KEY` **obrigatório** em prod para `/ops/*`.

## O que não substitui o elo ops

| Canal | Limitação |
|-------|-----------|
| Só dashboard web | Não avisa se você não abre a página |
| Banner in-app (`RuntimeDegradedBanner`) | Só para usuário logado; não é pager do operador |
| GCP uptime | Infra genérica; não cobre sync fail rate / LLM cascade |

Combinação saudável: **webhook push (ntfy/email)** + **dashboard `/ops`** no link do payload.

## Fase 1 — critério de saída (revisado)

- Probe + regras detectam API down / PG slow / sync / LLM sem usuário reportar
- Dispatch aciona **canal configurado** (local ou cloud), não Slack por padrão
- (Futuro) LLM triage + dispatch só se `human_required`

## Referências

- `docs/OPERATION_MODEL.md` §13–14
- `docs/OBSERVABILITY.md`
- `packages/api/src/application/ops/ops-alert-dispatch.service.ts`
