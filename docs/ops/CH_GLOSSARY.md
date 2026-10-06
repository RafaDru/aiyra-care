# CH — Glossário (agentes, gates, refs)

> **Última atualização:** 2026-10-06  
> **Uso:** alinhar chat, issues, automations Cursor e UI do Command Hub sem misturar siglas.

**Relacionado:** [`COMMAND_HUB.md`](./COMMAND_HUB.md) · [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md) · [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) · [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md)

---

## Siglas de plataforma

| Sigla | Nome | O que é |
|-------|------|---------|
| **CH** | **Command Hub** | Plataforma interna AiyraCare — console `:3013`, rotas ops, pipeline INC/DEF. Marca «CH»; paths técnicos legados `docs/ops/`, `OPS_*`. |
| **INC** | **Incidente** | Linha na fila `ops_analysis_queue` com ref humana **`INC-*`** (reporte, alerta, bridge `client_errors`, etc.). Estados na coluna `incident_pipeline_status`. |
| **DEF** | **Defeito** | Registro `platform_defects` com ref **`DEF-*`**, criado ou vinculado após triagem bem-sucedida; dedup por fingerprint; N INC podem apontar ao mesmo DEF. |

Fluxo resumido: **sinal → INC → (triagem) → DEF → PR → merge → DEF corrigido + INC resolvido**.

---

## Agentes 1 / 2 / 3 ↔ automations Cursor

Na documentação e no stack autônomo, **Agent 1 / 2 / 3** são os três papéis agênticos do ciclo defeito (não confundir com fases **G1–G4** da Ava em `docs/AVA_OPERATIONAL.md`).

| Agente | Papel (nome curto) | Automation no Cursor (nome na UI) | Payload `type` | Disparo típico |
|--------|-------------------|-----------------------------------|----------------|----------------|
| **Agent 1** | **Triagem** | **`Aiyra - Triador (dev)`** ou **`Aiyra - Triador SRE`** *(lanes legadas também citadas como `AiCare - Suporte ao Desenvolvimento` / `AiCare - Suporte SRE`)* | `support_report` · `ops_alert` | Outbox após INC; callback `POST /api/analysis-queue/callback` |
| **Agent 2** | **Correção Dev** | **`Aiyra - Correção Dev`** | `defect_fix_v1` | G2 — `POST /api/platform-defects/:id/start-fix`; callback `POST /api/platform-defects/callback` |
| **Agent 3** | **Revisão Dev** | **`Aiyra - Revisão Dev`** | `defect_pr_review_v1` | DEF `ready_for_pr` + `prUrl` (auto se `CH_AUTO_PR_REVIEW_ON_READY`); `POST …/request-review`; callback `POST …/review-callback` |

**Sinônimos aceitos no chat:** «triagem» = Agent 1; «correção» / «Correção Dev» = Agent 2; «revisão agêntica» / «Revisão Dev» = Agent 3.

Detalhe de env, webhooks e playbooks: [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md) · índice colável na UI: [`../automations-ch-duas-lanes-instructions.md`](../automations-ch-duas-lanes-instructions.md).

---

## Gates G0–G4 (nomes em linguagem clara)

Gates são **pontos onde o operador pode intervir** no ciclo INC/DEF. Não são nomes de automations.

| Gate | Nome claro | Quando | Ação típica |
|------|------------|--------|-------------|
| **G0** | **Priorizar ou descartar na fila** | INC ainda sem defeito; fila barulhenta | Priorizar, descartar (`dismissed`) ou deixar seguir o dispatch |
| **G1** | **Triagem manual** | Triagem ambígua, legado suporte, ou agente travado | Completar análise, descartar, ou destravar callback / re-dispatch |
| **G2** | **Autorizar correção** | DEF `open` (ou reenfileirar após falha) | **Iniciar correção** / **Reenfileirar** → dispara Agent 2 (Correção Dev) |
| **G3** | **Revisar PR e aprovar merge** | DEF `ready_for_pr` com PR | Review Agent 3 (advisory) + **Aprovar para merge** / pedir mudanças; merge no GitHub (agêntico com política do repo — ver [`CH_G3_AGENTIC_APPROVAL.md`](./CH_G3_AGENTIC_APPROVAL.md)) |
| **G4** | **Declarar corrigido e resolver incidente** | Após merge em `main` | Webhook merge → DEF `fixed` + INC vinculados **`resolved`**; ou **Corrigido** manual no CH |

Runbook passo a passo: [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md) · fechamento ritual C1–C9: [`CH_CYCLE_CLOSE_SPEC.md`](./CH_CYCLE_CLOSE_SPEC.md).

---

## Mapa rápido (uma linha)

```text
CH (:3013)  →  INC-*  →  Agent 1 Triagem  →  DEF-*  →  G2  →  Agent 2 Correção Dev
  →  ready_for_pr  →  Agent 3 Revisão Dev  →  G3 merge  →  G4 fixed + INC resolved
```

---

## O que não misturar

| Termo | Significado |
|-------|-------------|
| **G1–G4 (Ava)** | Fases do companheiro no app (`docs/AVA_OPERATIONAL.md`) — aceleradores, ações com confirmação, tools. |
| **G0–G4 (CH)** | Gates operacionais do ciclo incidente/defeito (esta página). |
| **Tier 0 / Tier 1** | Profundidade da automation de investigação/correção (`OPS_INVESTIGATOR_TIER1`) — não é gate G0–G4. |
