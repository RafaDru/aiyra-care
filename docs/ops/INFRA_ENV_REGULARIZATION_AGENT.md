# Agente — regularização de ambiente (Ambiente 1)

Agente **permanente** disparado pelo CH quando o alerta `infra_api_down` entra na fila de investigação (auto em **Verificar e acionar** ou manual em **Analisar → Disparar agente**). Complementa o Tier 0 SRE: em vez de só rascunhar hipóteses, o agente **verifica portas**, lê `api.log`, **remedia** o stack local dentro de limites do [`OPS_SOLO_OPERATOR_CHARTER.md`](../OPS_SOLO_OPERATOR_CHARTER.md) e reporta **PASS/FAIL** no callback do CH.

## Quando usar vs Suporte SRE

| | **Regularização ambiente** | **Suporte SRE (Tier 0)** |
|---|---------------------------|---------------------------|
| Alerta | `infra_api_down` (integration / notebook) | Qualquer `ops_alert` infra/sync/llm |
| Webhook | `CURSOR_INFRA_ENV_REGULARIZATION_*` | `CURSOR_SRE_SUPPORT_*` |
| Ação | Restart stack / `up.ps1`, re-probe | Markdown em `docs/ops/investigations/` |
| Worker | `machineHint` → My Machines (`NotebookRafael`) | Nuvem ou notebook |

Se `CURSOR_INFRA_ENV_REGULARIZATION_AUTOMATION_WEBHOOK_URL` **não** estiver configurado, `infra_api_down` continua na lane SRE (comportamento anterior).

## Configuração (uma vez)

1. Cursor → **Automations** → nova automation **Aiyra — Regularização ambiente** (webhook).
2. **My Machines** → worker `NotebookRafael` (ou o valor de `CURSOR_WORKER_NAME`).
3. Colar instructions: bloco em [`docs/automations-aiyra-infra-env-regularization-instructions.md`](../automations-aiyra-infra-env-regularization-instructions.md).
4. `.env` (notebook):

```env
CURSOR_INFRA_ENV_REGULARIZATION_AUTOMATION_WEBHOOK_URL=https://api2.cursor.sh/automations/webhook/...
CURSOR_INFRA_ENV_REGULARIZATION_AUTOMATION_WEBHOOK_KEY=crsr_...
CURSOR_WORKER_NAME=NotebookRafael
```

5. Reiniciar API `:3010` e ops-console `:3013`.

Saúde: `GET http://127.0.0.1:3013/api/incident-dispatch/health` → `webhooks.infraEnvRegularization.ready`.

## Payload (`type: ops_alert`)

Campos relevantes além do contrato SRE:

| Campo | Exemplo | Uso |
|-------|---------|-----|
| `alert_kind` | `infra_api_down` | Roteamento na Automation |
| `machineHint` | `NotebookRafael` | Forçar execução no notebook |
| `agentRole` | `infra_env_regularization` | Diferencia SRE no mesmo `type` |
| `investigation.playbook` | `infra-env-regularization` | Playbook repo |
| `analysisQueue.lane` | `infra_env_regularization` | CH / pilha |

Simulação local: `npm run ops:infra-env-regularization:simulate`.

## Playbook técnico

- Repo: [`docs/ops/automations/infra-env-regularization.prompt.md`](./automations/infra-env-regularization.prompt.md)
- Workflow referência: [`.cursor/automations/infra-env-regularization.workflow.json`](../../.cursor/automations/infra-env-regularization.workflow.json)

## Autonomia limitada (charter)

**Permitido no notebook (`machineHint`):**

- `GET` health `:3010/health`, `:5173`, `:3013/health`
- `tail` de `api.log` / `web.log` na raiz do worktree (sem PHI)
- `npm run env:status`
- **Uma** remediação se API down **> 60s** após verificação: `powershell -File scripts/up.ps1` **ou** `POST /api/stack/restart` no CH (equivalente a `aiyracare-stack.ps1`)
- Re-sonda: `POST http://127.0.0.1:3013/api/alerts/check` (probe + métricas) ou `npm run ops:probe` se disponível

**Proibido:**

- Merge em `main`, migrações destrutivas, alterar `.env` secrets, mais de **um** ciclo restart/`up.ps1` por disparo
- Se FAIL após remediação → callback com resumo + artefato; escalar via markdown SRE (não insistir)

## Callback

Igual ao SRE: `POST analysisQueue.callbackUrl` com `investigationId`, `remediationSummary` (incluir **PASS** ou **FAIL** e portas finais), `analysisArtifactPath` → `docs/ops/investigations/YYYY-MM-DD-infra_api_down-env-reg.md`.

## Referências

- Auditoria 13/10/2026: [`docs/infra-monitoring-resilience-audit-2026-10-13.md`](../infra-monitoring-resilience-audit-2026-10-13.md)
- Lanes: [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md)
- Runbook alertas: [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md)
