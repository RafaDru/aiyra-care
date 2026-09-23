# Ops — escopo MVP (pré-produção)

> **Última atualização:** 2026-09-23  
> **Status:** fonte de verdade enquanto **Preview (Ambiente 2) está pausado**.  
> Alinha App + Web + Plataforma + Ops em **um** ambiente de integração antes de staging e produção.

Decisão registrada em [`HISTORICO.md`](../HISTORICO.md) (2026-09-23). Ambiente Preview: [`ENV_PREVIEW.md`](../infra/ENV_PREVIEW.md).

---

## Objetivo

Operar o AiyraCare com **observabilidade suficiente** para detectar falhas de infra e produto, triar suporte e preparar go-live — **sem** manter duas pilhas ops (integração + preview) nem expandir automations até o MVP de produto estar verde em regression.

---

## Ambiente único (integração)

| Item | Valor |
|------|--------|
| API | `http://127.0.0.1:3010` |
| Web | `http://localhost:5173` |
| Ops console | `http://127.0.0.1:3013` → PG `aiyracare` |
| Postgres | `postgresql://…/aiyracare` |
| `OPS_METRICS_KEY` | Uma chave (integration / `setup:ops-alerts`) |
| `OPS_WORKER_MONITOR` | **`0` ou unset** — sem pager `worker_stale` sem worker |
| Connect-worker | **Opcional** no dev; alertas sob demanda: `npm run ops:alerts-check` ou `connect-worker:ops-alerts:once` |

**Não ritualizar** até MVP verde: `up:preview`, `setup:ops-preview`, console `:3023`, `preview:validate`, dual keys preview.

---

## Ops MVP — dentro do escopo

### 1. Saúde e sondas

| Capacidade | Como |
|------------|------|
| API / PG | `GET /health`, `GET /health/db` |
| Bundle ops | `npm run ops:probe` (ou probe no ciclo de `ops:alerts-check`) |
| Smoke | `npm run ops:smoke` (local com stack; CI com skip HTTP quando aplicável) |

### 2. Métricas e alertas (mínimo)

| Capacidade | Como |
|------------|------|
| Snapshot | `npm run ops:metrics` ou `GET /ops/metrics` + header `x-internal-ops-key` |
| Avaliação | `npm run ops:alerts-check` |
| Dispatch | `OPS_ALERT_WEBHOOK_URL` (ex. notifier local `:3012`) |
| Política | `OPS_ALERTS_DISPATCH_MODE=human_required`, `OPS_ALERTS_MIN_SEVERITY=critical` |
| Loop contínuo | Só se necessário: `OPS_ALERTS_INTERVAL_MS` no connect-worker **ou** cron — **não** loop na API se houver múltiplas réplicas no futuro |

Runbook: [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md) — apenas alertas **habilitados** nesta fase.

### 3. Console `:3013` — abas que importam no MVP

| Aba | Uso MVP |
|-----|---------|
| **Visão geral** | Alertas critical, KPIs |
| **Produto & UX** | `client_errors`, mapa de features |
| **Sync** | Jobs, fail rate, stuck |
| **Suporte** | Fila `support_reports` (se «Reportar problema» no escopo MVP) |
| **Infra** | Probe, stack health |

**Uso secundário (abrir quando necessário):** Ava & LLM, Custo interno, Issues/automation.

Detalhe: [`CONSOLE.md`](./CONSOLE.md).

### 4. Suporte (migration 061)

| Item | MVP |
|------|-----|
| Ingest | `POST /support/reports` + UI |
| Triagem | Console aba Suporte + estados na PG |
| Webhook opcional | `SUPPORT_REPORT_WEBHOOK_URL` |
| Investigador Cursor | **Pausado por default:** `OPS_SUPPORT_INVESTIGATOR_MODE=batch` ou desligar batch no worker até staging voltar |

Docs: [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md).

### 5. Telemetria (sem PHI)

| Tabela / fluxo | MVP |
|----------------|-----|
| `product_events` | Allowlist existente |
| `client_errors` | Fingerprints para console |
| `sync_jobs` | Alertas sync |

Regras LGPD: [`TELEMETRY.md`](./TELEMETRY.md).

### 6. Testes e gates

| Comando | Quando |
|---------|--------|
| `npm run test:ops` | Após mudança em `application/ops` ou alertas |
| `npm run promotion:gates` | Antes de pedir aprovação / merge sensível |
| `npm run qa:run-all -- --lane regression` | Gate funcional pré-`main` (produto) |
| Lane `ops` em QA | Suites ops documentadas; executar quando tocar fluxo ops |

---

## Congelado (código pode existir — ritual não)

| Item | Motivo |
|------|--------|
| Ops **preview** (`:3023`, `setup:ops-preview`, segunda `OPS_METRICS_KEY`) | Ambiente 2 pausado |
| `OPS_WORKER_MONITOR=1` sem worker | Pager falso |
| Relatório semanal automático em loop | `OPS_BUSINESS_WEEKLY_INTERVAL_MS` — usar one-shot se precisar |
| Bridge dev-audit como gate diário | Opcional / sob demanda |
| Novas abas console, novos tipos de alerta | Só com critério MVP ou pós-staging |
| GCP preview worker / `promote-preview` como rotina | Retomar antes de produção |
| Investigador support **immediate** + automations ruidosas | Reduzir paralelismo agente |

---

## O que volta com **staging** (antes de produção)

1. Subir Ambiente 2: [`ENV_PREVIEW.md`](../infra/ENV_PREVIEW.md) + `npm run up:preview`.
2. `setup:ops-preview`, console `:3023`, keys distintas — [`OPS_TWO_ENV_SETUP.md`](../infra/OPS_TWO_ENV_SETUP.md).
3. `staging:probe-gate` na API preview.
4. Connect-worker no preview com `OPS_WORKER_MONITOR=1` se sync agendado for testado.
5. Reativar promoção documentada em [`TWO_ENV_MODEL.md`](../infra/TWO_ENV_MODEL.md).

Ordem alvo: **MVP integração verde (regression + gates)** → **staging** → **produção** (CNPJ + gates humanos).

---

## Ritual sessão Ops (agente / humano)

1. Ler este arquivo + [`README.md`](./README.md).
2. Uma PG, uma key, uma console (`3013`).
3. Entregar ops: runbook se alerta novo; `TELEMETRY.md` se query nova; `test:ops` + relatório PASS/FAIL.
4. Não reintroduzir preview nos checklists até decisão explícita em `HISTORICO`.

---

## Referências

| Doc | Conteúdo |
|-----|----------|
| [`OPERATION_MODEL.md`](../OPERATION_MODEL.md) | Pirâmide escalação |
| [`OPS_TWO_ENV_SETUP.md`](../infra/OPS_TWO_ENV_SETUP.md) | Dual-env (referência futura) |
| [`QA_PROCESS.md`](../testing/QA_PROCESS.md) | Lanes regression vs business-full |
| [`business-analytics-ops.md`](../features/business-analytics-ops.md) | Métricas negócio no console |
