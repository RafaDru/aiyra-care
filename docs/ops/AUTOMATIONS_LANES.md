# Lanes — Cursor Automations (ops)

Duas automations, responsabilidades distintas, **mesmo par de webhooks** no `.env` (URLs diferentes por lane).

| Lane | Automation (nome no Cursor) | Payload `type` | Vars `.env` | Origem típica |
|------|------------------------------|----------------|-------------|---------------|
| **Suporte ao Desenvolvimento** | `AiCare - Suporte ao Desenvolvimento` | `support_report` | `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_*` | Reporte manual no app |
| **Suporte SRE** | `AiCare - Suporte SRE` | `ops_alert` | `CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_*` | Métricas / alertas ops |

Ambiente (`integration` \| `preview` \| `production`) vai em `environment.deploymentTier` no JSON — não duplique Automations por ambiente.

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

Se ainda usa nomes antigos («Investigador suporte» / «Investigador alertas ops»), renomeie na UI ou reimporte os JSON em `.cursor/automations/` — as URLs dos webhooks **não mudam** ao renomear.

## Fase 1 — Pilha + callback

- Tabela `ops_analysis_queue` (migration **066**): `node packages/api/scripts/apply-migration-066.mjs`
- Enfileira em todo reporte/alerta investigado; payload inclui `analysisQueue.id` + `callbackUrl`
- Agente finaliza com `POST /api/analysis-queue/callback` (header `x-investigator-callback-key` = `OPS_INVESTIGATOR_CALLBACK_KEY` ou `OPS_METRICS_KEY`)
- Console: aba **Issues** (`?tab=issues`) — status `fix_proposed` → botão **Revisado**
- `GET /api/analysis-queue/attention-counts` — contadores no **tray** (menu Issues, poll 60s)
- **Pré-análise** (`OPS_ANALYSIS_PRE_SCREEN`, default on): smoke `sim_*` → dismissed; `other`/UX sem bundle técnico → defer (sem agente auto)

> Callback em dev: o agente Cursor na nuvem **não alcança** `127.0.0.1:3013` — use preview público ou conclua manualmente até GCP.

Runbook suporte: `docs/ops/SUPPORT_INVESTIGATOR_AUTOMATION.md` · import: `.cursor/automations/README.md`
