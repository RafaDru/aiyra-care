# CH / Ops — gap analysis e prioridade (Rafael 2026-10-06)

**Alinhamento operacional aprovado:** telemetria/falha → INC → triagem → DEF → correção → PR → review agêntico; **manual:** G3 «Aprovar para merge» no CH + merge GitHub humano.

**Hub narrativo:** [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md) · **Manutenção:** [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md) · **Ciclo C1–C9:** [`CH_CYCLE_CLOSE_SPEC.md`](./CH_CYCLE_CLOSE_SPEC.md)

**Prioridade de engenharia:** itens desta visão **não** em `main` ou **partial** abaixo vêm **antes** de trabalho genérico de produto.

---

## Tabela capacidade × status

| Capacidade | Status | Evidência (código / doc) | Lacuna / próximo passo |
|------------|--------|---------------------------|-------------------------|
| **Ingest `client_errors`** | exists | `POST /telemetry/client-errors` · `packages/api/src/application/telemetry/client-error.service.ts` · mig **051** · [`TELEMETRY.md`](./TELEMETRY.md) | Retention job 90d (backlog TELEMETRY) |
| **Bridge client_error → INC** | partial | `ClientErrorIncidentBridgeService` · mig **078** · env piloto · [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md) | Default `BRIDGE_ENABLED=0`; allowlist 3 features; `MIN_COUNT` no config **não** aplicado no service |
| **Universal failure ingress** | missing | Spec § em [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md) (Rafael 2026-10-06) | Épico `client-error-universal-ingress`: rotas mobile, `integration_links`, expandir features + rollout por fase |
| **API 5xx → INC (hook)** | partial | `registerClientErrorIncidentErrorHandler` · `client-error-incident-bridge.plugin.ts` · vitest `client-error-incident-error-handler.test.ts` | Só prefixos env; sem correlação `incident_id` degradado global |
| **Manutenção planejada (suppress auto-INC)** | partial | `OPS_PLANNED_MAINTENANCE` · bridge/5xx gate · CH banner read-only (`/health` + ops-console) | opcional suppress ops_alert dispatch; tabela `ops_runtime_flags` v2 |
| **Support reports (humano)** | exists | `POST /support/reports` · mig **061** · [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md) · feature [`support-user-reports`](../features/support-user-reports.md) | Screenshot KMS backlog |
| **Ops alerts → INC** | exists | `ops-alert-dispatch` / fila · [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md) | Manutenção: não suprimir alertas SRE por padrão (spec manutenção) |
| **Incident dispatch (outbox)** | exists | `IncidentDispatchService` · mig **074–077** · [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) §4 | F4 SLA timers; D9–D10 atenção |
| **Triagem Agent 1** | exists | Webhook triador · `analysis-queue-callback` · `triage-started` · vitest triage callback | Batch suporte 6h (modo batch) |
| **DEF create + dedup** | exists | `platform-defect.service` · mig **071+** · [`CH_DEFECT_PIPELINE_DECISIONS.md`](./CH_DEFECT_PIPELINE_DECISIONS.md) | — |
| **Correção Agent 2 (G2)** | exists | `platform-defect-fix-dispatch` · `defect_fix_v1` · gate dispatch sent | Tier1 env documentado |
| **PR review Agent 3 (R3)** | exists | `platform-defect-pr-review.service` · mig **085** · [`CH_PR_REVIEW_AGENT.md`](./CH_PR_REVIEW_AGENT.md) | Roadmap `ch-solo-operator-r3` ainda `planned` (drift doc) |
| **G3 approve merge (CH UI)** | partial | Review card CH · merge manual GitHub | `CH_G3_REQUIRE_REVIEW_APPROVE` **não** wired no ops-console (fatia **C5**) |
| **R4 merge → fixed + INC resolved** | exists | `platform-defect-merge-webhook.service` · mig **081/084** | Métricas tempo fase (**C8**) |
| **CI pipeline ↔ defeito (R2)** | missing | Spec mig **086** · [`CH_CYCLE_CLOSE_SPEC.md`](./CH_CYCLE_CLOSE_SPEC.md) §4–5 | C2–C4: DDL, webhook/poll GitHub, `ci_failed → in_fix` |
| **CH cycle-close C1–C9** | partial | C1 spec + suite `ops-ch-cycle-close` **done** | C2–C9 implementação; `CH_PR_REVIEW_REQUIRE_CI_GREEN=0` até ingest CI |
| **Notebook callback auth** | partial | `resolveInvestigatorCallbackAuth` · `OPS_INVESTIGATOR_CALLBACK_KEY` · [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md) §10 túnel | Sem `OPS_CONSOLE_PUBLIC_URL` + túnel, automações cloud **não** alcançam callback — blocker operacional documentado em [`CH_ACCESS.md`](./CH_ACCESS.md) + audit `ch-shell-callbackauth` 2026-09-28 |
| **CH v2 / notebook worktree** | partial | CH v2 em `main` pós-#74; [`CH_ACCESS.md`](./CH_ACCESS.md) nota ch-shell | Validar `up.ps1` não sobrescreve ops-console legado |

---

## Fila de implementação (ordem)

1. **`ops-planned-maintenance`** — env gate bridge + 5xx (**v1 código**); CH banner; QA `ops-planned-maintenance`.
2. **`client-error-universal-ingress`** — expandir allowlist, mapa features, `MIN_COUNT` real, fases rollout.
3. **Bridge hardening** — dedupe/noise policy, notebook vs prod defaults na spec bridge.
4. **`ch-cycle-close` C2–C4** — CI ingest (webhook + poll); depende de `GITHUB_OPS_TOKEN` / secrets.
5. **`ch-cycle-close` C5** — `CH_G3_REQUIRE_REVIEW_APPROVE` no ops-console.
6. **`ch-cycle-close` C6–C9** — timeline, métricas, declaração piloto.

**Paralelismo:** manutenção (1) e universal ingress (2) podem correr em paralelo com **C2** se times distintos; **recomendação:** fechar (1) antes de ligar bridge em prod durante deploys.

---

## Decisões já tomadas (2026-10-06)

| Tema | Decisão |
|------|---------|
| G3 gate env | `CH_G3_REQUIRE_REVIEW_APPROVE=0` no notebook; approve merge só na UI CH (humano) |
| CI gate review | `CH_PR_REVIEW_REQUIRE_CI_GREEN=0` até C3 ingest CI |
| Manutenção | Suprimir auto-INC telemetria + 5xx; ingest continua; support reports humanos **sim** (banner) |
| Merge `main` | Sempre humano (GitHub) |

---

## QA / ritual

| Suite | Escopo |
|-------|--------|
| `client-error-ch-bridge` | Bridge piloto allowlist |
| `ops-planned-maintenance` | Flag manutenção + bridge off |
| `ops-ch-cycle-close` | Ciclo completo (manual + piloto) |
| `support-user-report` | Entrada humana |

Ver [`docs/testing/BUSINESS_ACTION_MATRIX.md`](../testing/BUSINESS_ACTION_MATRIX.md).
