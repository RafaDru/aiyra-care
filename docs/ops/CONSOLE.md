# Console ops — guia por aba

> Console independente: `packages/ops-console` · `:3013` (integração) / `:3023` (preview).  
> Lê **Postgres direto** + sonda API monitorada — não passa pelo JWT do app.

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

## Contextos (Produto · Operação · Plataforma)

O Command Hub usa um seletor no topo para separar **análise de negócio** de **operação ao vivo**:

| Contexto | Abas |
|----------|------|
| **Produto** | Negócio, Estratégia (CX), Marketing, Finanças, Ciclo de vida, UX & telemetria, **Mobile**, Custos |
| **Operação** | Incidentes (Issues), Suporte, Sincronismo, Ava |
| **Plataforma** | Visão geral, Infra (+ logs do stack) |

Query string: `?context=operation&tab=issues` (persistido em `localStorage`).

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

### Logs do stack (tail)

Não é um único “log do sistema”: são **arquivos na raiz do monorepo** (ou preview com sufixo `-preview`), lidos por `GET /api/stack/logs`:

| Aba no card | Arquivo | Conteúdo |
|-------------|---------|----------|
| **API** | `api.log` / `api-preview.log` | stdout do Fastify (`scripts/aiyracare-stack.ps1`) |
| **Web** | `web.log` / `web-preview.log` | stdout do Vite (`:5173` / `:5174`) |
| **Stack ops** | `stack-ops.log` | Start/Stop/Restart pelo console |
| **Expo / Metro** | `packages/mobile/.expo-lan-log.txt` | opcional — dev mobile `:8081`, não controlado pelo card |

Se API/Web foram iniciados manualmente sem redirecionar para esses arquivos, o painel mostra “arquivo ainda não existe”. **Reinicie o processo do ops-console** após deploy local para ver o UI novo.

---

## Aba: Mobile (Produto)

**Objetivo:** visão ops do shell Expo — paridade com web, checklist de dev e KPIs de erro `mobile_*` no catálogo.

| Bloco | Fonte |
|-------|--------|
| Tabela paridade | `docs/features/mobile-app-shell.md` |
| Erros 24h | `client_errors` feature `mobile_shell` (quando telemetria existir) |

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
