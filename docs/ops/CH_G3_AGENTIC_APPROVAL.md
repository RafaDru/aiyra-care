# CH — G3 agêntico («Aprovar para merge»)

**Data:** 2026-10-06  
**Charter:** [`OPS_SOLO_OPERATOR_CHARTER.md`](../OPS_SOLO_OPERATOR_CHARTER.md) §4 — aprovação G3 via agente/automation, não clique humano do Rafael.

---

## O que é G3 no CH

| Ação | Onde | Efeito |
|------|------|--------|
| **Review Agent 3 (R3)** | `POST /api/platform-defects/review-callback` | Recomendação `approve` \| `request_changes` \| `block` (advisory) |
| **G3 operador** | `POST /api/platform-defects/:id/operator-approve-pr` | Registra intent de merge (`operator_pr_approved_at`) e abre PR no GitHub |
| **Merge** | GitHub (humano ou bot de merge agêntico separado) | Webhook R4 → `fixed` + INC `resolved` |

G3 agêntico **não** faz merge em `main` — só registra aprovação no CH após review favorável (e CI, se configurado).

---

## Env

| Variável | Default | Comportamento |
|----------|---------|---------------|
| `CH_G3_AGENTIC_AUTO_APPROVE` | `0` | `1` = após `review-callback` com `status=completed` e `recommendation=approve`, chama `operatorApprovePr` com nota `[agentic] auto after review approve` |
| `CH_G3_REQUIRE_REVIEW_APPROVE` | `0` (notebook) | `1` = botão/script G3 exige última review `approve` ou `override` auditável |
| `CH_PR_REVIEW_REQUIRE_CI_GREEN` | `0` | `1` = auto G3 só se `pipeline_status=ci_success` **ou** `ciSnapshot.status/conclusion=success` no callback |

`GET /health` do ops-console expõe `chG3AgenticAutoApprove` e `chG3RequireReviewApprove`.

---

## Script CLI (agente / notebook worker)

```bash
npm run ch:defect-operator-approve -- --ref DEF-000042
npm run ch:defect-operator-approve -- --id <uuid> --note "pós-review cloud agent"
```

- Base URL: `OPS_CONSOLE_PUBLIC_URL` ou `http://127.0.0.1:$OPS_CONSOLE_PORT` (default `3013`).
- Header opcional `x-internal-ops-key: $OPS_METRICS_KEY` (mesmo padrão de callbacks internos).
- Override gate: `--override --override-reason "…"`.

---

## Fluxo com auto-approve

```text
ready_for_pr + prUrl
  → request-review (auto ou manual)
  → Agent 3 → review-callback (approve)
       └─ se CH_G3_AGENTIC_AUTO_APPROVE=1 → operator-approve-pr (agentic)
  → merge GitHub (agente quando CI verde)
  → webhook merge → fixed
```

Recuperação manual: script acima ou automação que chame a mesma rota.

---

## QA

- Vitest: `packages/api/tests/ch-g3-agentic-approve.helper.test.ts`, `platform-defect-pr-review.test.ts` (hook pós-callback).
- Suite ritual: [`ops-ch-cycle-close`](../testing/suites/ops-ch-cycle-close.md) §D (quando flag ligada no ambiente de teste).

---

## Referências

- [`CH_PR_REVIEW_AGENT.md`](./CH_PR_REVIEW_AGENT.md) · [`CH_CYCLE_CLOSE_SPEC.md`](./CH_CYCLE_CLOSE_SPEC.md) §5.1  
- [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md)
