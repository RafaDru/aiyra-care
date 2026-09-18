# Investigação — payload_type_mismatch (backend_task_handoff)

- **investigationId:** _ausente no webhook_
- **Severidade:** desconhecida (payload não é `ops_alert`)
- **Categoria:** n/a
- **Mensagem:** Automação **AiCare Suporte SRE** recebeu `type: backend_task_handoff` em vez de `type: ops_alert`.
- **Tier:** 0 (rascunho automático)
- **Gatilho:** automação (`automationId` 345b4e86-a88f-11f1-b532-320a589b8025)
- **Notas ops:** Correlacionar com smoke de handoff Claude → GitHub Actions → Cursor (`TASK-20260918-02`, PR #35). Campos esperados (`alertId`, `environment`, `analysisQueue`, `investigation`, `triage`, `dashboardUrl`) **não** vieram no corpo.

## Payload recebido (resumo)

| Campo | Valor |
|-------|--------|
| `type` | `backend_task_handoff` |
| `taskId` | `TASK-20260918-02` |
| `prUrl` | https://github.com/RafaDru/aiyra-care/pull/35 |
| `branch` | `cursor/handoff-smoke-cycle-2-f954` |
| `queueStatus` | `review` |
| `trigger` | `github_actions_pr` |

## Hipóteses

1. **Webhook errado na lane SRE** — URL de `CURSOR_BACKEND_HANDOFF_*` (ou workflow de handoff) apontando para a automação **Suporte SRE** (`ops_alert`) em vez da automação de desenvolvimento/backend. Padrão similar ao incidente 2026-09-14 (smoke `ops_alert` na lane de suporte-report).
2. **Smoke cycle 2 acoplado ao PR #35** — O handoff de coordenação disparou esta run (`bc-ed879241-087f-42bf-8dc7-8dd40c1e1fbd`) sem enfileirar item em `ops_analysis_queue`; por isso não há `analysisQueue.callbackUrl` para callback.
3. **Alerta ops real inexistente nesta execução** — Não há `alertId` nem `category: infra` para aplicar runbook de probes; investigação de infra local no pod do agente não se aplica (`GET /health` em `:3010` indisponível no ambiente do cloud agent — esperado).

## Evidências no repo

- Playbook lane SRE: `docs/ops/automations/ops-alert-investigator.prompt.md` — exige `type: ops_alert`.
- Lanes: `docs/ops/AUTOMATIONS_LANES.md` — SRE = `ops_alert`; desenvolvimento = `support_report` / handoff separado.
- Dispatch ops: `packages/api/src/application/ops/ops-alert-investigator-dispatch.ts` — payload canônico com `investigationId` + `analysisQueue`.
- Simulador smoke ops: `scripts/ops-alert-investigator-simulate.mjs` — referência de payload válido.
- Memória automação: incidente 2026-09-14 payload incompleto / webhook cruzado.

## Próximo passo humano

1. No GitHub Actions / secrets, confirmar que **`CURSOR_BACKEND_HANDOFF_AUTOMATION_WEBHOOK_URL`** (ou equivalente do smoke) **não** é a mesma URL que **`CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL`**.
2. Re-disparar smoke **ops** com `node scripts/ops-alert-investigator-simulate.mjs` e validar no console Issues (`investigationId`, callback).
3. Se havia alerta real pendente, usar console ops → Issues → **Analisar** no `alertId` correto (gera fila + callback).
4. Marcar esta run como falso positivo de roteamento; não tratar PR #35 como remediação de infra.

## Console

_dashboardUrl ausente no payload — abrir console ops local Issues quando disponível._
