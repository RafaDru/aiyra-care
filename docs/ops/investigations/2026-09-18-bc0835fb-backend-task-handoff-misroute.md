# Investigação — payload_misroute_backend_task_handoff

- **investigationId:** _(ausente no webhook)_
- **Severidade:** n/a (payload não é `ops_alert`)
- **Categoria:** n/a
- **Mensagem:** Automação **AiCare Suporte SRE** disparada com `type: backend_task_handoff` em vez de `ops_alert`.
- **Tier:** 0 (rascunho automático — sem PR de correção de produto)
- **Gatilho:** `github_actions_pr` (handoff smoke cycle 2)
- **Notas ops:** Correlação com `TASK-20260918-02`, PR [#35](https://github.com/RafaDru/aiyra-care/pull/35) (`cursor/handoff-smoke-cycle-2-f954`, merged). Run Cursor: `bc-0835fb0c-d9f1-402c-b577-614e75c3d6ba`.

## Payload recebido (webhook)

```json
{
  "type": "backend_task_handoff",
  "taskId": "TASK-20260918-02",
  "prUrl": "https://github.com/RafaDru/aiyra-care/pull/35",
  "prNumber": 35,
  "branch": "cursor/handoff-smoke-cycle-2-f954",
  "queueStatus": "review",
  "trigger": "github_actions_pr",
  "repo": "RafaDru/aiyra-care",
  "submittedAt": "2026-09-18T17:12:15Z"
}
```

**Campos esperados ausentes:** `alertId`, `severity`, `category`, `message`, `environment`, `triage`, `dashboardUrl`, `investigation`, `analysisQueue` / `investigationId`.

## Hipóteses

1. **Webhook errado no GitHub Actions (mais provável):** o workflow de handoff backend (`CURSOR_BACKEND_HANDOFF_*`) está postando na URL da lane **Suporte SRE** (`CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL`) em vez da automação de handoff/coordenação dedicada.
2. **Secret duplicado:** `CURSOR_BACKEND_HANDOFF_AUTOMATION_WEBHOOK_URL` (ou equivalente) copiado com o mesmo valor do SRE durante o smoke cycle 2.
3. **Smoke intencional parcial:** o PR #35 valida apenas o encadeamento GHA → Cursor; não valida o contrato `ops_alert` — este run confirma que o **roteamento de lane** ainda precisa isolamento.

## Evidências no repo

- Playbook SRE exige `type: ops_alert` — `docs/ops/automations/ops-alert-investigator.prompt.md`.
- Lanes separadas — `docs/ops/AUTOMATIONS_LANES.md` (`ops_alert` → `CURSOR_SRE_SUPPORT_*` apenas para alertas ops).
- Builder de payload ops — `packages/api/src/application/ops/ops-alert-investigator-dispatch.ts` (`type: 'ops_alert'`, `analysisQueue.callbackUrl`).
- Memória de run anterior (2026-09-18): mesmo padrão de misroute documentado em `/cursor/stores/automation/memories/MEMORIES.md`.

## Próximo passo humano

1. No GitHub **Actions secrets** / `.env` de CI: garantir que `CURSOR_BACKEND_HANDOFF_*` aponte para a **automation de handoff backend**, não para **AiCare Suporte SRE**.
2. Reexecutar smoke ops com `node scripts/ops-alert-investigator-simulate.mjs` (payload `ops_alert` + `analysisQueue`) contra a URL SRE.
3. Reexecutar handoff smoke (TASK) contra a URL de handoff; confirmar que a lane SRE **não** dispara.
4. Se um item ficou preso na pilha Issues: marcar **Concluir** manualmente no ops-console (sem `investigationId` neste webhook não há callback automático).

## Callback

**Não enviado** — `analysisQueue.callbackUrl` ausente no payload. Sem `investigationId` não há correlação com `ops_analysis_queue`.

## Console

_(dashboardUrl não fornecido — abrir ops-console local/preview na aba Issues se necessário)_
