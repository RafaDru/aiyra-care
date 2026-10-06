# CH — stack ops autônoma (hub)

**Data:** 2026-10-06 · Narrativa única para Rafael / agentes  
**Gap detalhado:** [`CH_OPS_GAP_AND_PRIORITY.md`](./CH_OPS_GAP_AND_PRIORITY.md)

---

## Pipeline (automático vs manual)

```text
[Sinais]
  client_errors / 5xx (bridge) ──┐
  support_reports (humano)     ├──► INC-* (ops_analysis_queue)
  ops_alerts                     │
                                 ▼
                    dispatch outbox → Triagem (Agent 1)
                                 ▼
                    DEF-* (dedup fingerprint)
                                 ▼
                    Correção (Agent 2) → ready_for_pr
                                 ▼
                    Review (Agent 3, advisory) ──► CI snapshot (R2, C2–C4)
                                 ▼
              ┌── G3 «Aprovar para merge» — script `ch:defect-operator-approve` ou `CH_G3_AGENTIC_AUTO_APPROVE=1` pós-review
              └── MANUAL: merge GitHub (agente após CI; não Rafael)
                                 ▼
                    webhook merge → DEF fixed + INC resolved (R4)
```

| Etapa | Automático | Manual obrigatório |
|-------|------------|-------------------|
| Telemetria → INC | Bridge + alertas (se habilitado) | — |
| Triagem → DEF | Webhook + callback | G0 descartar / priorizar |
| Correção → PR | Agent 2 | G2 «Iniciar correção» implícito no fluxo CH |
| Review | `CH_AUTO_PR_REVIEW_ON_READY` | — |
| G3 approve CH | `CH_G3_AGENTIC_AUTO_APPROVE` + review `approve` | Override / gate `CH_G3_REQUIRE_REVIEW_APPROVE` |
| Merge | — | Agente (GitHub); webhook R4 fecha DEF |
| Fechar INC | Após merge (webhook) | G4 confirmação se sem webhook |

**Env notebook (aprovado):** `CH_G3_REQUIRE_REVIEW_APPROVE=0`; `CH_PR_REVIEW_REQUIRE_CI_GREEN=0` até ingest CI (C3).

---

## Peças transversais

| Peça | Doc |
|------|-----|
| Bridge telemetria | [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md) |
| Manutenção (noise gate) | [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md) |
| INC/DEF máquinas de estado | [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) |
| Fechamento C1–C9 | [`CH_CYCLE_CLOSE_SPEC.md`](./CH_CYCLE_CLOSE_SPEC.md) |
| Review Agent 3 | [`CH_PR_REVIEW_AGENT.md`](./CH_PR_REVIEW_AGENT.md) |
| Suporte usuário | [`SUPPORT_REPORTS.md`](./SUPPORT_REPORTS.md) |

---

## Ordem de implementação (fatias)

1. **Manutenção v1** (`ops-planned-maintenance`) — baixo risco; desbloqueia deploys com bridge on.
2. **Bridge hardening + universal ingress** (`client-error-universal-ingress`) — em **paralelo** com C2 se necessário; **antes** de expandir allowlist em prod.
3. **C2** — migration 086 `pipeline_status`.
4. **C3–C4** — webhook/poll CI + `ci_failed → in_fix`.
5. **C5** — `CH_G3_REQUIRE_REVIEW_APPROVE` no ops-console.
6. **C6–C8** — UX timeline + métricas.
7. **C9** — `ops-ch-cycle-close` PASS piloto.

**Justificativa manutenção vs C2:** C2 não reduz ruído de INC durante deploy; manutenção sim. Portanto **manutenção primeiro** (ou paralelo curto), **não** depois de C9.

---

## Blocker notebook (callback)

Automações Cursor na nuvem exigem `OPS_CONSOLE_PUBLIC_URL` (túnel HTTPS) + `OPS_INVESTIGATOR_CALLBACK_KEY`. Sem isso, triagem/correção ficam em `dispatch_failed` ou SLA — ver [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md) §10 e [`CH_ACCESS.md`](./CH_ACCESS.md).
