# CH — Sinalização de anomalias no acionamento agêntico (suporte)

**Versão:** 2026-09-25 · **Status:** incorporado no monorepo  
**Relacionado:** [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) (PR [#74](https://github.com/RafaDru/aiyra-care/pull/74))

## 1. Fluxo esperado (happy path)

```
Incidente criado (open)
  → outbox pending
  → webhook Cursor 2xx (forwarded)
  → agente 1 em andamento (in_triage)
  → callback triagem (triaged | dismissed)
  → defeito platform_defects (se new_defect | link_defect)
```

**O que o operador deve ver:** transições claras na coluna Status; sem ação manual.

---

## 2. Taxonomia de desvios (tudo que “foge do esperado”)

Cada linha deve ser **visível no CH** (tag, banner, coluna auxiliar ou detalhe expandível) e **auditável** (`last_error`, `product_events` / `ops_analysis_queue` context).

| ID | Cenário | Sintoma UI hoje / desejado | Sinais técnicos | Ação operador |
|----|---------|---------------------------|-----------------|---------------|
| **D1** | Webhook não configurado | **Falha** ou badge «Config» | dispatch `skipped:webhook_not_configured` | Configurar `CURSOR_*` + retry |
| **D2** | Webhook HTTP 4xx/5xx | **Falha** + `last_error` | outbox `pending`/`failed`, bump attempts | Corrigir automação Cursor; **Nova tentativa** |
| **D3** | Esgotou tentativas | **Falha** (076+) | outbox `dead`, `max_attempts` | **Nova tentativa** ou reset-dead CLI |
| **D4** | Pipeline/outbox inconsistente | ex. `queued_worker` + outbox `dead` (pré-076) | mismatch PG | reset-dead / retry; após 4bd8f7d revert automático |
| **D5** | Sem outbox (legado / buraco) | **Aberto** há muito tempo | `open`, zero outbox | backfill / reconciliador |
| **D6** | Dois workers (corrida) | Rajada 40x, dead em massa | logs concorrentes claim | `CH_INCIDENT_DISPATCH_WORKER=0` + um loop |
| **D7** | Pre-screen dismiss/defer | **Aberto** ou oculto | `dismissed`/deferred legado | Revisar regra pre_screen; não re-dispatch |
| **D8** | Modo batch suporte | Demora até janela | `OPS_SUPPORT_INVESTIGATOR_MODE=batch` | Documentar SLA; não é falha |
| **D9** | Encaminhado sem agente | **Encaminhado** parado | `forwarded`, sem `in_triage` > N min | Alerta «automação não iniciou» (F4) |
| **D10** | Em triagem sem callback | **Em triagem** > SLA | `in_triage`, sem callback URL hit | Verificar run Cursor + callback URL/key |
| **D11** | Callback triagem falhou | **Em triagem** ou failed legado | HTTP 4xx no callback | Logs API `:3010` investigator callback |
| **D12** | Payload/outbox inválido | **Falha** | `unknown_outbox_kind`, `support_report_not_found` | Dados órfãos; fix manual |
| **D13** | Re-dispatch indevido (bug forwarded) | Loop 40x | outbox `forwarded` re-claimado | Corrigido `listPending` só `pending` |

---

## 3. Princípios de sinalização (produto)

1. **Um estado terminal de falha explícito** — `dispatch_failed` + label **Falha** (076); nunca mascarar como «Em fila» ou «Aberto» silencioso.
2. **Motivo legível** — no detalhe do incidente: `last_error` sanitizado (sem URL/key), `attempt_count`, timestamp último dispatch.
3. **Ação sempre visível** — **Nova tentativa** em Falha; link «Ver automação Cursor» (dashboard) quando configurado.
4. **Banner de saúde do pipeline** (Operação → Incidentes): contadores «N em falha», «N abertos > 1h sem outbox», «webhook ausente» se env missing no processo que serve o ops-console.
5. **Não alarmar o normal** — `queued_worker` por segundos durante claim é OK; só alertar se > 2–5 min ou com outbox não-pending (F4).
6. **Telemetria** — evento `incident_dispatch_anomaly` com `code: D1..D13` para dashboard ops futuro.

---

## 4. Implementação por fatias

| Fatia | Entrega |
|-------|---------|
| **F1** | Status Falha + retry + revert failure (076, 4bd8f7d, 8df6985) |
| **F2** | Painel detalhe incidente: bloco «Dispatch» (outbox status, `attempt_count`, `last_error` sanitizado, `forwarded_at`) |
| **F3** | Banner topo Incidentes: `GET /api/incident-dispatch/health` — dead count, webhooks `CURSOR_*`, stale open sem outbox (1h) |
| **F4** | SLA timers: `forwarded` > 15m sem `in_triage`; `in_triage` > 24h sem callback → tag **Atenção** |
| **F5** | Ops alert webhook (opcional): não implementar sem pedido explícito |

---

## 5. Mapeamento UI (coluna Status)

| Bucket UI | Inclui | Exclui / não confundir |
|-----------|--------|-------------------------|
| Aberto | `open`, elegível dispatch | `dispatch_failed` |
| Encaminhado | `forwarded` | |
| Em fila | `queued_worker` (curto) | outbox `dead` → **Falha** |
| Em triagem | `in_triage` | |
| **Falha** | `dispatch_failed`, outbox dead | |
| *(futuro)* **Atenção** | SLA D9/D10 | |
