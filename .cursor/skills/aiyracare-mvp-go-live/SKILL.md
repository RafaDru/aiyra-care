---
name: aiyracare-mvp-go-live
description: Walk MVP beta go-live pillars from MVP_GO_LIVE_CHECKLIST.md; split Rafael (decisions) vs agents (execution); map work to #produto and #ops lanes. Use before public beta or when AC items target go-live/domínio.
---

# AiyraCare — MVP go-live

Canonical checklist: [`docs/product/MVP_GO_LIVE_CHECKLIST.md`](../../docs/product/MVP_GO_LIVE_CHECKLIST.md).

Related: [`ONBOARDING_MVP_GATE.md`](../../docs/product/ONBOARDING_MVP_GATE.md), [`USABILITY_JOURNEYS.md`](../../docs/product/USABILITY_JOURNEYS.md), [`FOCO_ATUAL.md`](../../docs/FOCO_ATUAL.md) frente A.

Charter: [`docs/OPS_SOLO_OPERATOR_CHARTER.md`](../../docs/OPS_SOLO_OPERATOR_CHARTER.md).

## Sinal verde (resumo)

Go-live beta only when:

- Pilares **1–5** without critical open items (exceptions dated + owner in `HISTORICO.md`).
- J1–J3 smoke documented in `USABILITY_JOURNEYS.md` (minimum pre-domain).
- **Rafael** — strategic decision to open beta (not agentic).

## Pilares × quem faz × lane

| Pilar | Tema | Lane | Agente (Cloud / notebook) | Rafael (humano) |
|-------|------|------|---------------------------|-----------------|
| **1** | Site institucional `/home`, CTAs, legal links, QA `auth-entry-flow` | `#produto` | Eng/copy PRs, seed legal docs, env `LEGAL_*`, suites | Revisão conteúdo/copy tier; preços não vinculantes |
| **2** | Gate Anel A + J1 suites + regressão | `#produto` | Wizard/gate code, docs gate; **`aiyracare-qa-notebook`** for J1 E2E | — |
| **3** | PJ / legal / compliance gate | `#produto` + policy | Publish `docs/legal/` via API, `COMPLIANCE_GATE_ENABLED`, scrape gate eng ([#178](https://github.com/RafaDru/aiyra-care/pull/178)) | **CNPJ**, fiscal, mapa LGPD, fila [`HUMAN_REVIEW_QUEUE.md`](../../docs/HUMAN_REVIEW_QUEUE.md) |
| **4** | Domínio, DNS, OAuth callbacks, e-mail transacional | `#produto` / infra | `API_PUBLIC_URL`, Supabase redirect URLs in runbooks, deploy scripts | **Registro domínio**, decisão www.*, SPF/DKIM policy |
| **5** | Beta deploy, preview, ops alertas, rollback | `#ops` (+ deploy) | `promotion:gates`, preview validate, GCP runbooks, `preview:post-deploy`, OPS keys/webhooks | Aprovação preview→beta quando gates + checklist OK |

**Anel B** (progressive profiling) is **not** gate for go-live—track in [`anel-b-progressive-profiling.md`](../../docs/features/anel-b-progressive-profiling.md); do not block pillar 2 closure on Anel B completeness.

## Steps (agent)

1. Open checklist; for each row mark **eng done** vs **open** (mirror checklist `[x] eng` vs `[ ]`).
2. Map open items to **next AC** or PR scope; respect [`PARALLEL_WORK.md`](../../docs/PARALLEL_WORK.md)—no Anel B UI + big CH refactor in one PR.
3. For pillar 2.5–2.6: invoke **`aiyracare-qa-notebook`** on My Machines (lane `regression` or suites listed in gate doc).
4. For pillar 5: ops lane—`npm run test:ops`, smoke per [`DEPLOY_BETA_RUNBOOK.md`](../../docs/infra/DEPLOY_BETA_RUNBOOK.md).
5. Escalate **only** decision rows (CNPJ, beta público, jurídico billing) to Rafael—one question with options + recommendation.

## Output template

```markdown
## MVP go-live status — {date}
| Pilar | Críticos abertos | Próximo agente | Bloqueio humano |
|-------|------------------|----------------|-----------------|
| 1 | … | … | sim/não |
| … | … | … | … |
- **Recomendação:** (preview / wait legal / notebook J1 first)
```

## References

- Modelo de trabalho: [`docs/CURSOR_WORK_MODEL.md`](../../docs/CURSOR_WORK_MODEL.md)
- Legal: [`docs/LEGAL_COMPLIANCE.md`](../../docs/LEGAL_COMPLIANCE.md)
- Deploy: [`docs/infra/DEPLOY_BETA_RUNBOOK.md`](../../docs/infra/DEPLOY_BETA_RUNBOOK.md)
