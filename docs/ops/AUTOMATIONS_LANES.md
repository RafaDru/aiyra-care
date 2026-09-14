# Lanes — Cursor Automations (ops)

Duas automations, responsabilidades distintas, **mesmo par de webhooks** no `.env` (URLs diferentes por lane).

| Lane | Automation (nome no Cursor) | Payload `type` | Vars `.env` | Origem típica |
|------|------------------------------|----------------|-------------|---------------|
| **Suporte Desenvolvimento** | `AiyraCare — Suporte Desenvolvimento (Tier 0)` | `support_report` | `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_*` | Reporte manual no app |
| **Suporte SRE** | `AiyraCare — Suporte SRE (Tier 0)` | `ops_alert` | `CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_*` | Métricas / alertas ops |

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

Runbook suporte: `docs/ops/SUPPORT_INVESTIGATOR_AUTOMATION.md` · import: `.cursor/automations/README.md`
