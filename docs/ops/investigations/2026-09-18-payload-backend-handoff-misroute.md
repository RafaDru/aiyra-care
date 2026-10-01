# Investigação — payload inválido (backend_task_handoff na lane SRE)

- **investigationId:** *(ausente no webhook — callback indisponível)*
- **Severidade:** desconhecida (`ops_alert` não recebido)
- **Categoria:** desconhecida
- **Mensagem:** Automação **AiCare — Suporte SRE** disparada sem payload `ops_alert`.
- **Tier:** 0 (rascunho automático)
- **Gatilho:** webhook externo (`github_actions_pr`)
- **Notas ops:** Smoke de handoff backend (`TASK-20260918-02`, PR #35) atingiu a URL da lane SRE. Ver `docs/ops/AUTOMATIONS_LANES.md` e memória `ops-alert-investigator` (misfire 2026-09-14).

## Payload recebido (metadados)

```json
{
  "type": "backend_task_handoff",
  "taskId": "TASK-20260918-02",
  "prUrl": "https://github.com/RafaDru/aiyra-care/pull/35",
  "prNumber": 35,
  "branch": "cursor/handoff-smoke-cycle-2-f954",
  "queueStatus": "review",
  "trigger": "github_actions_pr",
  "repo": "RafaDru/aiyra-care"
}
```

**Campos esperados ausentes:** `alertId`, `severity`, `category`, `message`, `triage`, `dashboardUrl`, `environment`, `investigation`, `analysisQueue`, `investigationId`.

## Hipóteses

1. **URL de webhook incorreta no workflow de handoff (principal)** — O job GitHub Actions (`CURSOR_BACKEND_HANDOFF_*`) postou em `CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL` (ou URL compartilhada) em vez do webhook da lane backend/coordenação. O agente SRE não consegue mapear `alertId` nem enfileirar callback.
2. **Smoke cycle 2 validando só conectividade HTTP** — PR #35 descreve E2E Claude → GHA → Cursor Automation; o disparo prova que a automação roda, mas o **formato** do body não corresponde ao playbook `ops-alert-investigator.prompt.md` (`type: ops_alert`).
3. **Stack integration offline no host da sonda (contexto paralelo)** — Cloud Agent VM sem API `:3010` / PG `:5432`; irrelevante para fechar este item, mas explica por que um `sim_infra_api_down_*` real falharia aqui.

## Evidências no repo

| Verificação | Resultado |
|-------------|-----------|
| Playbook lane SRE | Exige `type: ops_alert` — `docs/ops/automations/ops-alert-investigator.prompt.md` |
| Payload builder ops | `packages/api/src/application/ops/ops-alert-investigator-dispatch.ts` — só emite `ops_alert` |
| Simulador correto | `scripts/ops-alert-investigator-simulate.mjs` — referência de shape + `analysisQueue` |
| `curl http://127.0.0.1:3010/health` | Conexão recusada (HTTP 000) |
| `npm run ops:probe` | `api.ok: false`, `postgres.ok: false`, `degraded: true` (`2026-09-18T17:11:46.285Z`) |
| Run correlacionado | PR #35 — handoff smoke, não alerta de métricas |

## Próximo passo humano

1. **Corrigir roteamento:** Garantir que `backend_task_handoff` use webhook da automação/coordenação adequada; **Suporte SRE** só recebe `ops_alert` (via `dispatchOpsAlertInvestigator` / simulate).
2. **Re-smoke SRE:** `npm run ops:alert-investigator:simulate` com `CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_*` apontando para **AiCare — Suporte SRE**; confirmar payload com `analysisQueue.callbackUrl`.
3. **Console:** Se item ficou preso em `investigating` sem callback, marcar conclusão manual ou reenfileirar com payload completo.
4. **Opcional:** Separar secrets GHA — handoff vs ops-alert — para evitar colisão (mesmo padrão do incidente support-report 2026-09-14).

## Callback

Não executado: `analysisQueue.callbackUrl` ausente. Quando reenviar com payload válido, POST com `investigationId`, `remediationSummary`, `analysisArtifactPath` (header `x-investigator-callback-key` ou `x-internal-ops-key`).

## Console

*(dashboardUrl ausente no payload — abrir console ops local `http://127.0.0.1:3013?tab=issues` no host de integração)*

## Remediação (resumo agente)

Misroute de webhook: lane SRE recebeu `backend_task_handoff` do smoke TASK-20260918-02. Ajustar URL/secrets do workflow de handoff; repetir simulador `ops_alert` com fila + callback. Tier 0 — sem alteração de código de produto neste run.
