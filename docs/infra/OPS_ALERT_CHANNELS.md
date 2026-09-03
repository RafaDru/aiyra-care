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
  "dashboardUrl": "http://127.0.0.1:3013"
}
```

Sem PHI. `dashboardUrl` vem de `OPS_ALERT_DASHBOARD_URL` ou default `http://127.0.0.1:3013` (console ops independente).

## Dev — sua máquina (sem Slack)

| Componente | Função |
|------------|--------|
| `packages/ops-console` | **Console observabilidade** — PG direto + sonda API; `:3013` |
| `scripts/ops-local-notifier-tray.ps1` | **Windows:** bandeja + menu (observabilidade, app, stack) |
| `scripts/ops-notifier-up.ps1` | Reinicia notificador (libera :3012) |
| `scripts/ops-local-notifier.mjs` | Headless (Linux / sem tray) |
| `scripts/ops-local-toast.ps1` | Toast auxiliar (fallback node headless) |
| `scripts/up.ps1` | Sobe console ops + notifier + defaults de webhook/dashboard |
| `http://127.0.0.1:3013` | Dashboard (não depende do web :5173 nem das rotas `/ops` da API) |

`.env` recomendado (ou defaults do `up.ps1`):

```env
OPS_ALERT_WEBHOOK_URL=http://127.0.0.1:3012/ops-alert
OPS_ALERT_DASHBOARD_URL=http://127.0.0.1:3013
OPS_CONSOLE_PORT=3013
OPS_METRICS_KEY=...   # npm run setup:ops-alerts (rotas /ops na API para workers/CLI)
OPS_ALERTS_DISPATCH_MODE=human_required   # default: só pager em alertas human_required
```

Fluxo quando algo crítico ocorre:

1. `npm run ops:alerts-check` (ou loop no connect-worker)
2. Toast na area de trabalho + browser abre o console ops (:3013)
3. Você investiga no painel (sem depender de Slack)

### Simular toasts (bateria de testes)

```powershell
npm run ops:notifier:simulate              # 6 cenários críticos (como produção)
npm run ops:notifier:simulate -- --all     # + 4 warnings (10 toasts)
npm run ops:notifier:simulate -- --scenario=llm_cascade
npm run test:ops:notifier                  # valida triagem sem POST
```

`OPS_LOCAL_NOTIFIER_OPEN=0` no processo do notificador evita abrir o browser em cada toast (só balloon).

Toasts usam UTF-8 via arquivo temporário; ícone/cor: **Error** (crítico), **Warning** (sync/infra aviso), **Info** (produto/Neo4j). Payload inclui `toast: { title, body, icon }`.


O notificador local **não roda na VM**. O elo precisa ser **alcançável fora do servidor**:

| Canal | Quando usar | Config |
|-------|-------------|--------|
| **Console ops `:3013`** | Sempre — estado ao abrir a URL dedicada | `OPS_ALERT_DASHBOARD_URL=https://ops…` |
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

Combinação saudável: **webhook push (ntfy/email)** + **console ops** no link do payload.

## Fase 1 — critério de saída (revisado)

- Probe + regras detectam API down / PG slow / sync / LLM sem usuário reportar
- Dispatch aciona **canal configurado** (local ou cloud), não Slack por padrão
- (Futuro) LLM triage + dispatch só se `human_required`

## Referências

- `docs/OPERATION_MODEL.md` §13–14
- `docs/OBSERVABILITY.md`
- `packages/api/src/application/ops/ops-alert-dispatch.service.ts`
