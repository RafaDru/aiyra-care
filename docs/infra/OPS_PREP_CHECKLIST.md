# Checklist — preparação Ops (Run)

> **Última atualização:** 2026-09-03  
> Épico: `prod-run-intelligence` · Runbook: [`docs/ops/RUNBOOK_ALERTS.md`](../ops/RUNBOOK_ALERTS.md) · Diagramas: [`docs/OPS_FALLBACKS_AND_ALERTS.md`](../OPS_FALLBACKS_AND_ALERTS.md)

## Objetivo

Validar que o loop **medir → alertar → triar → notificar → degradar** funciona no ambiente alvo antes de promover Preview ou prod.

## 1. Stack local (integração)

```powershell
# Na raiz do monorepo
powershell -File "$env:USERPROFILE\workspace\aiyra-care\scripts\up.ps1"
```

| Serviço | URL / porta |
|---------|-------------|
| API | http://127.0.0.1:3010/health |
| Web | http://127.0.0.1:5173 |
| Console ops | http://127.0.0.1:3013 |
| Notificador | http://127.0.0.1:3012/health |

## 2. Testes automatizados

```powershell
cd packages/api && npm run test:ops
npm run ops:smoke                    # CI: OPS_SMOKE_SKIP_HTTP=1
$env:OPS_SMOKE_SKIP_HTTP='0'; npm run ops:smoke   # com API no ar
```

## 3. Sonda e alertas

```powershell
npm run ops:probe
npm run ops:metrics
npm run ops:triage
npm run ops:alerts-check
npm run ops:notifier:simulate -- --scenario=llm_cascade
```

No console `:3013`: aba **Infra** → latência com faixas ok/warning/critical; botão **Verificar e acionar**.

## 4. Variáveis mínimas (`.env`)

| Variável | Efeito |
|----------|--------|
| `OPS_METRICS_KEY` | Protege `GET /ops/metrics` e `/ops/alerts` |
| `OPS_ALERT_WEBHOOK_URL` | Dispatch Slack-compatible (opcional local) |
| `OPS_ALERTS_INTERVAL_MS` | Loop no connect-worker (preferido) ou API |
| `OPS_ALERTS_DISPATCH_MODE` | `human_required` (padrão) |
| `OPS_ALERTS_MIN_SEVERITY` | `critical` (padrão) |
| `CONNECT_WORKER_EXTERNAL` | `1` na API quando worker externo roda probe+alertas |

Setup rápido: `npm run setup:ops-prod`

## 5. Preview (Ambiente 2)

```powershell
npm run setup:ops-preview          # gera .env.preview com OPS_METRICS_KEY distinto
npm run validate:ops-dual-keys       # confirma isolamento vs .env
npm run validate:env-tier -- --preview
npm run up:preview
$env:API_PUBLIC_URL = "http://127.0.0.1:3020"
npm run staging:probe-gate
npm run ops:alerts-check
npm run promotion:gates
```

**Isolamento:** integração usa `.env`; preview usa `.env` + `.env.preview` (override). Chaves ops **nunca** compartilhadas — ver `env-ops-dual-keys`.

## 6. Critérios de saída

- [ ] `test:ops` verde (56+ testes)
- [ ] `ops:smoke` verde (HTTP se API up)
- [ ] Console `:3013` com séries 24h e percentis 7d
- [ ] `validate:ops-dual-keys` verde (após `setup:ops-preview`)
- [ ] `promotion:gates` verde antes de merge/promote

## Próximos itens roadmap (`planned`)

| ID | Tema |
|----|------|
| `run-user-escalation` | Notificar família em sync crítico (opt-in, sem PHI) — **done** |
| `run-dev-audit-bridge` | Correlacionar `docs/dev-audit/` com `product_events` em staging |
| `env-preview-host` | Preview no GCP |
