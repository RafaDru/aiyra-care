# Lanes — Cursor Automations (ops)

Duas automations, responsabilidades distintas, **dois pares** URL + key no `.env` (uma Automation por lane).

| Lane | Automation (nome no Cursor) | Payload `type` | Vars `.env` | Origem típica |
|------|------------------------------|----------------|-------------|---------------|
| **Suporte ao Desenvolvimento** | `AiCare - Suporte ao Desenvolvimento` | `support_report` | `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL`, `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY` | Reporte manual no app |
| **Suporte SRE** | `AiCare - Suporte SRE` | `ops_alert` | `CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL`, `CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY` | Métricas / alertas ops |

Ambiente (`integration` \| `preview` \| `production`) vai em `environment.deploymentTier` no JSON — não duplique Automations por ambiente.

## `.env` ↔ Cursor — fonte da verdade

| Regra | Detalhe |
|-------|---------|
| **Painel Cursor** | Webhook URL e auth header (`crsr_…`) exibidos na Automation **após salvar** são a referência — copie para o `.env` do checkout que dispara (API `:3010`). |
| **URL** | `*_WEBHOOK_URL` no `.env` deve ser **idêntica** à URL do trigger Webhook na UI (sem truncar query string se o painel incluir). |
| **KEY** | `*_WEBHOOK_KEY` = valor atual do **Generate / Copy auth header**. Se regenerar no Cursor, **atualizar o `.env`** imediatamente; key antiga → HTTP **400** ou **401** no `POST` e outbox em retry/`dead`. |
| **Legado** | Fallback `CURSOR_SUPPORT_AUTOMATION_*` / `CURSOR_OPS_ALERT_AUTOMATION_*` — preferir nomes `CURSOR_DEVELOPMENT_SUPPORT_*` e `CURSOR_SRE_SUPPORT_*`. |
| **Callback** | Payload inclui `analysisQueue.callbackUrl` → `POST /api/analysis-queue/callback` no ops-console (`:3013`). Auth: `x-investigator-callback-key` = `OPS_INVESTIGATOR_CALLBACK_KEY` ou, se vazio, `OPS_METRICS_KEY`. |
| **Dashboard no payload** | `OPS_ALERT_DASHBOARD_URL` — ex. `http://127.0.0.1:5173/ops` é reescrito para `http://127.0.0.1:3013` ao montar links/callback (ver `resolveSupportReportOpsConsoleBaseUrl` na API). |
| **Reinício** | Após qualquer mudança em `CURSOR_*` ou keys ops: reiniciar **API `:3010`** e **ops-console `:3013`**. |
| **Saúde** | `curl -s http://127.0.0.1:3013/api/incident-dispatch/health` — `webhooks.*.ready` quando URL+key presentes no processo. |
| **Dev local** | Agente na nuvem **não** chama `127.0.0.1:3013` — callback manual ou stack com URL pública (preview/GCP). |

## Suporte Desenvolvimento

- **Foco:** bug de produto, UX, dado incorreto (triagem código/sync).
- **Auto:** todo `POST /support/reports`.
- **Console:** aba Suporte → **Analisar** / **Concluir**.
- **Playbook:** `docs/ops/automations/support-report-investigator.prompt.md`

## Suporte SRE

- **Foco:** infra, sync, LLM, telemetria — runbooks ops.
- **Auto:** só `infra` + `critical` + pager humano (`OPS_ALERT_INVESTIGATOR_AUTO`).
- **Console:** alertas derivados → **Analisar** / **Concluir**.
- **Playbook:** `docs/ops/automations/ops-alert-investigator.prompt.md`

## Renomear na conta Cursor

Se ainda usa nomes antigos («Investigador suporte» / «Investigador alertas ops»), renomeie na UI ou edite o prompt colando o texto atualizado dos YAML/JSON em `.cursor/automations/` — as URLs dos webhooks **não mudam** ao renomear.

## Fase 1 — Pilha + callback

- Tabela `ops_analysis_queue` (migration **068**): `node packages/api/scripts/apply-migration-068.mjs`
- Enfileira em todo reporte/alerta investigado; payload inclui `analysisQueue.id` + `callbackUrl`
- Agente finaliza com `POST /api/analysis-queue/callback` (header `x-investigator-callback-key` = `OPS_INVESTIGATOR_CALLBACK_KEY` ou `OPS_METRICS_KEY`)
- Console: aba **Issues** (`?tab=issues`) — status `fix_proposed` → botão **Revisado**
- `GET /api/analysis-queue/attention-counts` — contadores no **tray** (menu Issues, poll 60s)
- **Pré-análise** (`OPS_ANALYSIS_PRE_SCREEN`, default on): smoke `sim_*` → dismissed; `other`/UX sem bundle técnico → defer (sem agente auto)

> Callback em dev: o agente Cursor na nuvem **não alcança** `127.0.0.1:3013` — use preview público ou conclua manualmente até GCP.

Runbook suporte: `docs/ops/SUPPORT_INVESTIGATOR_AUTOMATION.md` · setup UI: `.cursor/automations/README.md`

## Correlação (`investigationId`)

Chave única = `ops_analysis_queue.id` — propagada em webhook, toast, console e callback. Ver `docs/ops/INVESTIGATION_CORRELATION.md`.

## Tier 1 — PR draft (opt-in)

- `OPS_INVESTIGATOR_TIER1=1` na API (default **off**)
- Payload inclui `investigation: { tier: 0|1, playbook, trigger }`
- Gates: `docs/ops/automations/TIER1_GATES.md`
- Suporte: `technical_bug` + `consentTechnical` → tier 1
- SRE: `infra`/`sync`; auto só `critical`
