# Foco atual — tracking vivo

> **Última atualização:** 2026-10-30  
> Complementa `roadmap.json` e `HISTORICO.md`. Duas frentes ativas — **não** abrir terceira lane sem pausar uma (`docs/PARALLEL_WORK.md`).

---

## Frentes (out/2026)

| Frente | Lane | Escopo | Onde acompanhar |
|--------|------|--------|-----------------|
| **A — MVP beta go-live** | `#produto` | Pilares go-live, Anel A em produto, **Anel B** backlog + slice contínuo, validação **J1** no notebook | [`product/MVP_GO_LIVE_CHECKLIST.md`](./product/MVP_GO_LIVE_CHECKLIST.md), [`product/ONBOARDING_MVP_GATE.md`](./product/ONBOARDING_MVP_GATE.md), [`features/anel-b-progressive-profiling.md`](./features/anel-b-progressive-profiling.md) |
| **B — Ops CH / automations** | `#ops` | Command Hub, investigationId, alertas, paste ritual Automations, dev-audit | [`ops/README.md`](./ops/README.md), [`ops/AUTOMATIONS_LANES.md`](./ops/AUTOMATIONS_LANES.md), [`ops/triagem-dev-automation-paste-kit.md`](./ops/triagem-dev-automation-paste-kit.md) |

**Regra:** PRs **separadas** — não misturar Anel B UI com refactor CH grande na mesma PR.

---

## Frente A — Produto (MVP beta)

### Wave mergeada em `main` (out/2026)

| PR | Entrega |
|----|---------|
| [#175](https://github.com/RafaDru/aiyra-care/pull/175) | Docs gate onboarding + checklist go-live |
| [#176](https://github.com/RafaDru/aiyra-care/pull/176) | Landing institucional `/home` |
| [#177](https://github.com/RafaDru/aiyra-care/pull/177) | **Anel A** — convênio/SUS **fora** do 1º onboarding |
| [#178](https://github.com/RafaDru/aiyra-care/pull/178) | Gate scrape **Fase 2** (prod tier) |
| [#179](https://github.com/RafaDru/aiyra-care/pull/179) | `DELETE /auth/account` — FK `care_circles` (LGPD) |
| [#180](https://github.com/RafaDru/aiyra-care/pull/180) | **Anel B slice 1** — CTAs pós-onboarding (integrações) |
| [#189](https://github.com/RafaDru/aiyra-care/pull/189) | **Anel B slice 3** — CTA integrações no card Início (dependente) |
| [#190](https://github.com/RafaDru/aiyra-care/pull/190) | Ritual **beta Sessão B** + E2E footer legal + `beta:bootstrap-legal` |

### Próximo trabalho produto

1. **Checklist go-live** — pilares 1–5 em [`MVP_GO_LIVE_CHECKLIST.md`](./product/MVP_GO_LIVE_CHECKLIST.md); ritual **beta sem marca** em [`BETA_PREP_WITHOUT_BRAND_LOCK.md`](./product/BETA_PREP_WITHOUT_BRAND_LOCK.md). **Preview:** `promotion:gates` notebook + GCP runbook.
2. **Anel B** — co-responsável / billing CTAs (slice 4+); card [`anel-b-progressive-profiling.md`](./features/anel-b-progressive-profiling.md).
3. **Notebook (J1)** — suites J1 + `patient-wallet` com E2E real; marcar checklist 1.10/2.5 notebook PASS.

**Definition of Done (tier ≥1):** suite QA da feature card com E2E real — CI verde **ou** notebook com PASS reportado. Cloud `qa:run` pré-voo **não** substitui DoD.

Decisões estratégicas (CNPJ, beta público, jurídico billing): **Rafael** — ver charter [`OPS_SOLO_OPERATOR_CHARTER.md`](./OPS_SOLO_OPERATOR_CHARTER.md).

---

## Frente B — Ops

- **Estado:** investigationId + lanes Automations; Tier 1 opt-in (`OPS_INVESTIGATOR_TIER1`); AC-1 = colar Instructions na UI Cursor (humano até import as code).
- **DoD ops:** `test:ops` / smoke ops quando tocar pipeline CH.
- **AC-23:** validar gate scrape **#178** com `DEPLOYMENT_TIER=production` no ambiente beta GCP (matriz regulatório × MVP no Project store).

---

## Histórico arquivado (não é foco «atual»)

Épico **family-day-to-day D1–D5** (set/2026), prioridades Ava G4 / B2B discovery e runs CI de set/2026 permanecem em [`HISTORICO.md`](./HISTORICO.md) e feature cards — **não** reabrir como lane principal.

---

## Ritual de atualização

Ao fechar entrega ou mudar prioridade:

1. Esta página + lane correta no Project `notes.md`
2. `docs/HISTORICO.md` — decisões
3. `docs/project-context.json` — decisões ativas
4. `docs/roadmap.json` — status dos épicos tocados

Ver também: [`AGENT_BOOTSTRAP.md`](./AGENT_BOOTSTRAP.md), [`CURSOR_WORK_MODEL.md`](./CURSOR_WORK_MODEL.md), [`testing/QA_PROCESS.md`](./testing/QA_PROCESS.md).
