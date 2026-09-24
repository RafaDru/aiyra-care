# Command Hub — console (guia por tela)

> UI: `packages/ops-console` · `:3013` (integração) / `:3023` (preview).  
> Lê **Postgres direto** + sonda API monitorada — não passa pelo JWT do app.

## Layout (Header + Nav + Conteúdo + Rodapé)

| Zona | Função |
|------|--------|
| **Header** | Marca Command Hub, chip de ambiente, **Atualizar** / **Verificar e acionar** |
| **Top nav** | Quatro áreas: **Operação** · **Produto** · **Negócio** · **Plataforma** (cores e ícones por zona) |
| **Sidebar** | Telas do grupo ativo (badges de atenção) |
| **Conteúdo** | Context bar (breadcrumb + descrição) + painel |
| **Rodapé** | Snapshot, probe, alertas, auto-refresh 60s, link docs CH |

**Mock visual (sem métricas):** `http://127.0.0.1:3013/mock/ch-layout` ou `/?mock=ch-layout` — faixa roxa no topo; **console real** (`http://127.0.0.1:3013/`) usa o **mesmo layout** com dados do Postgres (branch/PR com `layoutVersion: ch-shell-v1` em `GET /health`).

> Se ainda aparecerem **11 abas horizontais**, o código antigo está rodando — faça pull da branch `cursor/ch-layout-shell-193e` ou merge do PR #73 e reinicie `npm run ops:console`.

**URLs:** `?group=operacao&tab=overview` (compatível com `?tab=` legado).

| Grupo | Telas (`tab`) |
|-------|----------------|
| Operação | `overview`, `issues`, `sync`, `infra` |
| Produto | `produto` (Ciclo de vida), `product`, `support` |
| Negócio | `business`, `strategy` |
| Plataforma | `ava`, `cost` |

Mapa de código: `packages/ops-console/src/client/ch-navigation.ts`.

## Subir

```powershell
# Integração (default)
npm run ops:console

# Preview
$env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
$env:OPS_CONSOLE_PORT = "3023"
$env:DEPLOYMENT_TIER = "preview"
npm run ops:console
```

Abrir: `http://127.0.0.1:3013` ou `http://127.0.0.1:3023`

## Cabeçalho

| Controle | Ação |
|----------|------|
| **Atualizar** | `GET /api/metrics` + health |
| **Verificar e acionar** | `POST /api/alerts/check` — triagem + webhook |
| **Faixa de ambiente** | `integration` / `preview` / `production` (via `DEPLOYMENT_TIER` + porta) |

Auto-refresh: 60s (aba visível).

---

## Aba: Visão geral

**Objetivo:** saúde do sistema em um olhar + alertas derivados.

| Bloco | Fonte |
|-------|--------|
| KPIs (alertas, sync fail, Ava fail 5m) | `OpsMetricsService` |
| Gráficos 24h | `timeSeries24h` no snapshot |
| Tabela alertas | `evaluateOpsAlerts()` |

**Quando usar:** primeiro passo em qualquer incidente — ver [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md).

---

## Aba: Produto & UX

**Objetivo:** onde o usuário trava sem esperar ticket.

| Bloco | Fonte |
|-------|--------|
| Erros cliente 24h | `client_errors` agregado por fingerprint |
| Mapa de features | `ops-feature-catalog.ts` + eventos 24h |
| **Saúde por feature** | `buildFeatureHealthMatrix` — cruza `product_events` × `client_errors` |
| Sinais `hot`, `errors_only` | fail rate por feature |

**Queries manuais:** ver [`TELEMETRY.md`](./TELEMETRY.md#client_errors).

**Relacionado:** botão «Reportar problema» alimenta `support_reports` — ver [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md).

---

## Aba: Issues

**Objetivo:** pilha unificada de investigação (Suporte Dev + SRE).

| Bloco | Fonte |
|-------|--------|
| Fila `queued` → `fix_proposed` | `ops_analysis_queue` (migration 068) |
| Coluna **investigationId** | UUID canônico — correlaciona toast, webhook e Automations |
| Deep link | `?tab=issues&investigationId=<uuid>` |

Ver [`INVESTIGATION_CORRELATION.md`](./INVESTIGATION_CORRELATION.md).

---

## Aba: Suporte

**Objetivo:** chamados «Reportar problema» (fila humana + análise legada).

| Bloco | Fonte |
|-------|--------|
| Fila open / triaged / resolved | `support_reports` |
| **investigationId** (quando enfileirado) | join com `ops_analysis_queue` |
| Analisar / Concluir | dispara lane AiCare Dev |

---

## Aba: Sync & integrações

**Objetivo:** integrações (Unimed, Amil, Mater Dei, Hermes, etc.).

| Bloco | Fonte |
|-------|--------|
| Jobs recentes / stuck | `sync_jobs` |
| Fail rate por portal 24h | agregação PG |
| Alertas `sync_stuck`, `sync_fail_rate` | regras em `ops-alerts` |

**Escalação usuário (opt-in):** `sync_escalation_incidents` — webhook sem PHI.

---

## Aba: Ava & LLM

**Objetivo:** companion + cascata de modelos.

| Bloco | Fonte |
|-------|--------|
| Turnos / falhas 5m | `product_events` (`ava_chat_*`) |
| Tokens p50/p95 | `llm_usage_events` feature `ava_chat` |
| Quota blocked | `ava_quota_blocked` |
| Cascade 100% fail | alerta derivado |

Smoke LLM: `npm run test:smoke:llm`

---

## Aba: Infra

**Objetivo:** dependências e stack local.

| Bloco | Fonte |
|-------|--------|
| Probe API / Postgres / Neo4j | `runOpsProbe` |
| Card **Stack Aiyra** | start/stop API + web (só local) |
| `infra_*` alertas | health checks |

---

## Aba: Custo interno

**Objetivo:** LLM de classificação / higiene — **não** debita créditos do cliente.

| Bloco | Fonte |
|-------|--------|
| Orçamento R$/mês | `llm_internal_budget` |
| `budgetExhausted` | `llm_usage_events` `cost_bucket=internal` |

CLI: `npm run llm:internal-usage`

---

## API do console (interno)

| Rota | Uso |
|------|-----|
| `GET /health` | tier + porta |
| `GET /api/metrics` | snapshot completo |
| `POST /api/alerts/check` | dispatch |
| `GET /ops/dev-audit-bridge` | na **API** `:3010` (não no console) — bridge hooks |

---

## Aba: Suporte

**Objetivo:** fila de chamados «Reportar problema» (migration 061).

| Bloco | Fonte |
|-------|--------|
| KPIs abertos / 24h | `support_reports` + `support_report_submitted` |
| Fila | `GET /api/support-reports?status=open` (console) |
| Triagem | `PATCH /api/support-reports/:id` → `triaged` / `resolved` |

Runbook: [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md).

---

## Próximas melhorias (sessão Ops)

- [x] Aba **Suporte** — fila `support_reports` status `open`
- [ ] Link «Docs ops» no header → este diretório (path no tooltip)
- [ ] Sparkline de `support_report_submitted` / 24h
- [x] Webhook `SUPPORT_REPORT_WEBHOOK_URL`
