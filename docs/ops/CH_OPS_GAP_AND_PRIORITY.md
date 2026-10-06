# CH / Ops — gap analysis e prioridade (Rafael 2026-10-06)

**Alinhamento operacional (pós-charter + #114/#115):** telemetria/falha → INC → triagem → DEF → correção → PR → review agêntico → **G3 agêntico** (`operator-approve-pr`) → **merge agêntico** `main` quando CI/QA passam — **sem** clique humano no CH nem merge manual por Rafael.

**Hub narrativo:** [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md) · **G3 spec:** [`CH_G3_AGENTIC_APPROVAL.md`](./CH_G3_AGENTIC_APPROVAL.md) · **Túnel/callbacks:** [`CH_OPS_CALLBACK_TUNNEL_SPEC.md`](./CH_OPS_CALLBACK_TUNNEL_SPEC.md) · **Ingress prod:** [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) · **Manutenção:** [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md) · **Ciclo C1–C9:** [`CH_CYCLE_CLOSE_SPEC.md`](./CH_CYCLE_CLOSE_SPEC.md) · **Carta:** [`OPS_SOLO_OPERATOR_CHARTER.md`](../OPS_SOLO_OPERATOR_CHARTER.md)

**Prioridade de engenharia:** itens **partial** ou specs P0/P1 abaixo vêm antes de produto genérico.

---

## Entregas recentes `main`

| PR | Entrega |
|----|---------|
| [#114](https://github.com/RafaDru/aiyra-care/pull/114) | **C3–C8** cycle-close: webhook/poll CI, pipeline UI, G3 override UI, `register-pr`, métricas ciclo 7d |
| [#115](https://github.com/RafaDru/aiyra-care/pull/115) | Universal ingress fases 2–4 (mobile, `integration_links`, `ava_companion`); `MIN_COUNT` ativo no bridge |

---

## Tabela capacidade × status

| Capacidade | Status | Evidência (código / doc) | Lacuna / próximo passo |
|------------|--------|---------------------------|-------------------------|
| **Ingest `client_errors`** | exists | `POST /telemetry/client-errors` · mig **051** · [`TELEMETRY.md`](./TELEMETRY.md) | Retention job 90d (backlog TELEMETRY) |
| **Bridge client_error → INC** | exists | `ClientErrorIncidentBridgeService` · mig **078** · `MIN_COUNT` + dedupe · [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md) | Política preview/prod: [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) |
| **Universal failure ingress** | exists (0–4) | #115 · `client-error-incident-bridge.config.ts` | Tuning env prod; Ava gate médico na política |
| **API 5xx → INC (hook)** | exists | prefixos + `/integration-links` · manutenção gate | Correlação `incident_id` degradado global (backlog) |
| **Manutenção planejada (suppress auto-INC)** | partial v1+v2 | `OPS_PLANNED_MAINTENANCE` · bridge/5xx + ops_alert auto-INC (#118) · CH banner · vitest | `ops_runtime_flags` + toggle CH persistido |
| **Support reports (humano)** | exists | mig **061** · [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md) | Screenshot KMS backlog |
| **Ops alerts → INC** | exists | [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md) · auto-INC gated em manutenção (#118) | Webhook Slack opcional segue; triagem manual ok |
| **Incident dispatch (outbox)** | exists | mig **074–077** · [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) | F4 SLA timers; D9–D10 |
| **Triagem Agent 1** | exists | callback + `triage-started` | Batch suporte 6h |
| **DEF create + dedup** | exists | [`CH_DEFECT_PIPELINE_DECISIONS.md`](./CH_DEFECT_PIPELINE_DECISIONS.md) | — |
| **Correção Agent 2 (G2)** | exists | `defect_fix_v1` | — |
| **PR review Agent 3 (R3)** | exists | mig **085** · [`CH_PR_REVIEW_AGENT.md`](./CH_PR_REVIEW_AGENT.md) | Roadmap `ch-solo-operator-r3` → marcar **done** (drift) |
| **G3 approve merge** | partial | API `operator-approve-pr` + UI #114 | **Automação G3** sem UI — spec [`CH_G3_AGENTIC_APPROVAL.md`](./CH_G3_AGENTIC_APPROVAL.md); copy ops-console ainda diz «merge manual» |
| **CI ↔ defeito (R2)** | partial | #114 webhook `defect-ci` + poll · mig **086** | `CH_PR_REVIEW_REQUIRE_CI_GREEN=1` em prod quando webhook estável |
| **Merge → fixed + INC resolved** | exists | webhook `defect-merge` · mig **081/084** | Merge GitHub **agêntico** (charter); métricas C8 em uso |
| **CH cycle-close C1–C9** | partial | C1–C8 código #114 | **C9** declaração piloto + `qa:run` ritual |
| **Notebook callback / túnel** | documented | [`CH_OPS_CALLBACK_TUNNEL_SPEC.md`](./CH_OPS_CALLBACK_TUNNEL_SPEC.md) · runbook §10 | Named tunnel + webhooks GitHub no notebook (execução agente) |
| **CH v2 / notebook worktree** | partial | [`CH_ACCESS.md`](./CH_ACCESS.md) | Validar `up.ps1` vs ops-console legado |

---

## Fila de implementação (ordem)

1. **G3 agêntico + merge agêntico** — automation pós-`review-callback` chama `operator-approve-pr`; agente merge quando CI/QA OK (charter). Depende de túnel se review na nuvem.
2. **`ch-cycle-close` C9** — piloto DEF/INC + suite `ops-ch-cycle-close` PASS documentado.
3. **Ingress prod (política B)** — env preview/prod conforme [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md).
4. **`ops-planned-maintenance` v2** — runtime flags + opcional suppress ops_alert (stub spec).
5. **C8 métricas** — dashboards/alertas sobre tempos de fase (extensão opcional).

**Paralelismo:** (3) e túnel/webhooks (4) podem correr em paralelo com (1); manutenção v1 já desbloqueia deploy com bridge on.

---

## Decisões (atualizado pós-charter)

| Tema | Decisão |
|------|---------|
| G3 | Agente chama `operator-approve-pr`; `CH_G3_REQUIRE_REVIEW_APPROVE=1` recomendado em prod solo |
| CI gate review | `CH_PR_REVIEW_REQUIRE_CI_GREEN=1` quando defect-ci webhook ou poll ativo (#114) |
| Manutenção | Suprimir auto-INC bridge + 5xx; ingest continua; support reports **sim** |
| Merge `main` | **Agêntico** quando gates passam — [`OPS_SOLO_OPERATOR_CHARTER.md`](../OPS_SOLO_OPERATOR_CHARTER.md) |

---

## QA / ritual

| Suite | Escopo |
|-------|--------|
| `client-error-ch-bridge` | Bridge + manutenção |
| `ops-planned-maintenance` | Flag manutenção + bridge off |
| `ops-ch-cycle-close` | Ciclo completo incl. CI/G3 (#114) |
| `support-user-report` | Entrada humana |

Ver [`docs/testing/BUSINESS_ACTION_MATRIX.md`](../testing/BUSINESS_ACTION_MATRIX.md).
