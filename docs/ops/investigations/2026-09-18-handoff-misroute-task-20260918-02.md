# Investigação — payload inválido (lane SRE)

- **investigationId:** _(ausente no webhook)_
- **taskId (handoff):** `TASK-20260918-02`
- **Severidade:** _(não informada — payload não é `ops_alert`)_
- **Categoria:** _(não informada)_
- **Mensagem:** Webhook recebido com `type: backend_task_handoff` em vez de `ops_alert`.
- **Tier:** 0 (rascunho automático — sem correção de produto)
- **Gatilho:** `github_actions_queue_push` (fila backend / review)
- **Notas ops:** Execução Cursor Automation **AiCare - Suporte SRE** (`automationId` `345b4e86-a88f-11f1-b532-320a589b8025`). Cloud run: `bc-124929a9-a0ce-4963-865d-12388cadcf66`.

## Payload recebido (campos presentes)

| Campo | Valor |
|-------|--------|
| `type` | `backend_task_handoff` |
| `taskId` | `TASK-20260918-02` |
| `queueStatus` | `review` |
| `trigger` | `github_actions_queue_push` |
| `repo` | `RafaDru/aiyra-care` |
| `submittedAt` | `2026-09-18T17:12:22Z` |
| `prUrl` / `prNumber` / `branch` | vazios |

**Ausentes (obrigatórios para playbook SRE):** `alertId`, `severity`, `category`, `message`, `environment`, `triage`, `dashboardUrl`, `investigation`, `analysisQueue` (`id`, `callbackUrl`).

## Hipóteses

1. **Misroute de webhook (mais provável):** o job `github_actions_queue_push` postou na URL da lane **Suporte SRE** (`CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_*`) em vez da automation de handoff backend (`CURSOR_BACKEND_HANDOFF_*` ou equivalente). Ver `docs/ops/AUTOMATIONS_LANES.md` — lane SRE espera exclusivamente `type: ops_alert`.
2. **Smoke / teste de fila:** `queueStatus: review` e ausência de PR sugerem item de fila em revisão, não alerta de métricas ops.
3. **Regressão de roteamento:** repetição do padrão documentado em memória de automação (2026-09-18 handoff anterior com PR #35).

## Evidências no repo

- Playbook SRE exige `type: ops_alert`: `docs/ops/automations/ops-alert-investigator.prompt.md`.
- Lanes e vars: `docs/ops/AUTOMATIONS_LANES.md` (`CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_*` vs desenvolvimento).
- Payload canônico ops: `packages/api/src/application/ops/ops-alert-investigator-dispatch.ts` (`OpsAlertInvestigatorPayload`).
- Simulação válida: `scripts/ops-alert-investigator-simulate.mjs`.

## Próximo passo humano

1. Confirmar no GitHub Actions / secrets qual URL recebe `backend_task_handoff` — **não** deve ser a do Suporte SRE.
2. Re-disparar investigação SRE apenas com payload `ops_alert` completo (console **Analisar** ou `ops-alert-investigator-simulate.mjs` após enfileirar em `ops_analysis_queue`).
3. Se o alerta real existir no console ops, abrir `dashboardUrl` local e seguir `docs/ops/RUNBOOK_ALERTS.md` manualmente até o roteamento estar corrigido.
4. **Callback:** não executado — `analysisQueue.callbackUrl` ausente; concluir item na pilha Issues manualmente após correção de wiring.

## Console

_(dashboardUrl não fornecido — usar console ops Issues com `taskId` / fila backend como referência operacional.)_
