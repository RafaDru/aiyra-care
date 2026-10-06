# CH — stack ops autônoma (hub)

**Data:** 2026-10-06 · Narrativa única para Rafael / agentes  
**Gap detalhado:** [`CH_OPS_GAP_AND_PRIORITY.md`](./CH_OPS_GAP_AND_PRIORITY.md)

---

## Pipeline (automático vs manual)

```text
[Sinais]
  failure probes → client_errors / 5xx (bridge) ──┐
  support_reports (humano)                        ├──► INC-* (ops_analysis_queue)
  ops_alerts                                      │
                                 ▼
                    dispatch outbox → Triagem (Agent 1)
                                 ▼
                    DEF-* (dedup fingerprint)
                                 ▼
                    Correção (Agent 2) → ready_for_pr
                                 ▼
                    Review (Agent 3, advisory) ──► CI snapshot (R2, C2–C4)
                                 ▼
              ├── AGENTIC: G3 — `CH_G3_AGENTIC_AUTO_APPROVE` ou `ch:defect-operator-approve`
              └── AGENTIC: merge GitHub quando CI + QA (charter)
                                 ▼
                    webhook merge → DEF fixed + INC resolved (R4)
```

| Etapa | Automático / agêntico | Humano (só decisão §2 charter) |
|-------|----------------------|--------------------------------|
| Telemetria → INC | Bridge + alertas (se habilitado) | Política allowlist hoje → **Failure Probes** default-on ([`FAILURE_PROBES_CH.md`](./FAILURE_PROBES_CH.md)) |
| Triagem → DEF | Webhook + callback | G0 estratégico raro |
| Correção → PR | Agent 2 | — |
| Review | `CH_AUTO_PR_REVIEW_ON_READY` | — |
| G3 approve | `operator-approve-pr` (hook ou script) | Override reason = decisão explícita |
| Merge | Agente após gates | Veto estratégico («pausar merges») |
| Fechar INC | Após merge (webhook) | — |

**Env notebook (piloto):** `CH_G3_REQUIRE_REVIEW_APPROVE=0`; `CH_PR_REVIEW_REQUIRE_CI_GREEN=0` até webhook CI estável. **Prod solo (meta):** `CH_G3_REQUIRE_REVIEW_APPROVE=1`, `CH_PR_REVIEW_REQUIRE_CI_GREEN=1` com #114 defect-ci.

---

## Peças transversais

| Peça | Doc |
|------|-----|
| Failure Probes (spec) | [`FAILURE_PROBES_CH.md`](./FAILURE_PROBES_CH.md) |
| Bridge telemetria | [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md) |
| Manutenção (noise gate) | [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md) |
| INC/DEF máquinas de estado | [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) |
| Fechamento C1–C9 | [`CH_CYCLE_CLOSE_SPEC.md`](./CH_CYCLE_CLOSE_SPEC.md) |
| Review Agent 3 | [`CH_PR_REVIEW_AGENT.md`](./CH_PR_REVIEW_AGENT.md) |
| G3 agêntico | [`CH_G3_AGENTIC_APPROVAL.md`](./CH_G3_AGENTIC_APPROVAL.md) |
| Túnel + webhooks | [`CH_OPS_CALLBACK_TUNNEL_SPEC.md`](./CH_OPS_CALLBACK_TUNNEL_SPEC.md) |
| Ingress prod | [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) |
| Suporte usuário | [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md) |

---

## Ordem de implementação (fatias)

1. **Manutenção v1** (`ops-planned-maintenance`) — baixo risco; desbloqueia deploys com bridge on.
2. **Failure Probes M1–M2** (`failure-probes-ch`) — default-on + opt-out; substitui expansão manual de allowlist — spec [`FAILURE_PROBES_CH.md`](./FAILURE_PROBES_CH.md). Universal ingress (0–4) **done**; tuning prod via política ingress.
3. **C2** — migration 086 `pipeline_status`.
4. **C3–C4** — webhook/poll CI + `ci_failed → in_fix`.
5. **C5** — `CH_G3_REQUIRE_REVIEW_APPROVE` no ops-console.
6. **C6–C8** — UX timeline + métricas.
7. **C9** — `ops-ch-cycle-close` PASS piloto.

**Justificativa manutenção vs C2:** C2 não reduz ruído de INC durante deploy; manutenção sim. Portanto **manutenção primeiro** (ou paralelo curto), **não** depois de C9.

---

## Blocker notebook (callback)

Automações Cursor na nuvem exigem `OPS_CONSOLE_PUBLIC_URL` (túnel HTTPS) + `OPS_INVESTIGATOR_CALLBACK_KEY`. Sem isso, triagem/correção ficam em `dispatch_failed` ou SLA — spec completa [`CH_OPS_CALLBACK_TUNNEL_SPEC.md`](./CH_OPS_CALLBACK_TUNNEL_SPEC.md) · resumo [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md) §10 · [`CH_ACCESS.md`](./CH_ACCESS.md).
