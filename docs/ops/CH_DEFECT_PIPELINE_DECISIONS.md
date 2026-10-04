# CH — Decisões de pipeline INC/DEF e ops agêntico

**Data:** 2026-10-04 · **Status:** decisões formalizadas (Rafael)  
**Origem:** propostas no Project Agent Store (`ch-defect-pipeline-recurrence-proposal.md`, `ops-agentic-operating-model.md`).

**Relacionado:** [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) · [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md) · [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md) · épico `ch-solo-operator-journey` em [`docs/roadmap.json`](../roadmap.json).

---

## 1. R4 — Merge em `main` fecha o defeito (`fixed`)

O defeito CH é **first-class** na esteira GitHub (fatia **R4**).

| Etapa | Comportamento acordado |
|-------|------------------------|
| `ready_for_pr` | `prUrl` no defeito; opcional `defectId` / `DEF-*` no corpo do PR ou label |
| CI (R2) | Atualiza `pipeline_status` no defeito quando implementado |
| **Merge em `main`** | Webhook GitHub `pull_request` (`closed` + `merged`) → `platform_defects.status = fixed`, `merged_at`, `merged_pr_url` |
| **G3** | Merge continua exigindo **aprovação humana** de Rafael quando a política exigir |
| **G4** | Deixa de depender de clique manual **Corrigido** no CH quando o webhook confirmar merge |

**Incidente:** o estado terminal do INC permanece **`triaged`** (spec atual). O defeito pode ir a `fixed` sem reabrir a fila de incidentes. Opcional futuro (somente métricas): coluna ou flag `incident_resolution = linked_defect_fixed` — **não** reabre fila nem altera `incident_pipeline_status`.

---

## 2. Dedup N:1 — mesma fingerprint, defeito aberto

**Já implementado** em triagem (`createFromTriage` + `findOpenByFingerprint`).

| Condição | Ação |
|----------|------|
| Existe `platform_defects` com mesma `fingerprint` e `status IN ('open','in_fix','ready_for_pr')` | **Não** criar novo DEF; apenas `platform_defect_incidents` com `linked_by: agent_triage` |
| Índice PG | Parcial único em `fingerprint` para status abertos (migration **071**) |

Vários incidentes podem apontar para um único defeito aberto.

---

## 3. Reincidência — novo INC / novo DEF após correção

**Correção Rafael (2026-10-04):** o pipeline de incidente **não** ganha status terminal «Resolvido» (`resolved`). INC anterior permanece **`triaged`** quando o DEF vai a `fixed`; UX de fechamento é no defeito, não reabrindo o INC.

**Defeito (migration 083):** `createFromTriage` + `parent_defect_id` + badge CH no DEF.

**Incidente (migration 084):** nova ocorrência similar → **nova linha** `ops_analysis_queue` (novo `INC-*`), sem reabrir o INC triado:

| Campo | Uso |
|-------|-----|
| `recurrence_of_incident_id` | FK ao INC anterior (tipicamente `triaged`) |
| `recurrence_kind` | `reincidencia` quando o vínculo é explícito |

| Condição | Ação |
|----------|------|
| Mesma fonte/fingerprint após INC anterior `triaged` (e opcionalmente DEF `fixed`) | **Insert** novo INC + `recurrence_kind=reincidencia` |
| Índice parcial | Um INC «ativo» por `(source_type, source_id, deployment_tier)` — terminais `triaged` / `dismissed` liberam novo insert |
| Triagem `new_defect` + `parentDefectId` | Liga `recurrence_of_incident_id` ao INC do DEF pai quando aplicável |
| UI CH | Detalhe do INC: **Reincidência de INC-xxxxx** (deep link); DEF mantém badge §083 |

Não confundir com §2: dedup só aplica a defeitos **ainda abertos** na esteira.

---

## 4. Bounded context CH — hexagonal, PG, Neo4j

| Tópico | Decisão |
|--------|---------|
| **Contexto** | Command Hub = bounded context **Ops** no mesmo monorepo |
| **Camadas** | `packages/api/src/domain/ops` → `application/ops` → infra HTTP/PG; migrations **071+** |
| **UI** | `packages/ops-console` = console interno (**não** é segundo backend de domínio) |
| **Fonte de verdade** | PostgreSQL para `ops_analysis_queue`, `platform_defects`, outbox, lotes PR |
| **Neo4j** | **Não** persiste INC/DEF. Uso no CH limitado a **probe de infra** (ex. `infra_neo4j_down`). Associações clínicas seguem [`ARCHITECTURE_DATA_LAYERS.md`](../ARCHITECTURE_DATA_LAYERS.md) (entidades PG + associações Neo4j) |

---

## 5. Modelo operacional agêntico

**Rafael (humano):**

- Decisões estratégicas e coordenação pontual.
- Aprovação explícita de merge em `main` quando o gate **G3** exigir.
- **Não** realiza triagem diária de incidentes nem rotina de fechamento manual de defeitos no CH.

**Agentes e automações:**

- Coleta e encaminhamento periódico de incidentes pendentes (batch 15 min + dispatch Triador — ver cadência no épico `ch-solo-operator-journey`).
- Triagem via callback → `triaged` + criação/atualização de `DEF-*` (dedup §2).
- Correção Dev, `ready_for_pr`, transição para `fixed` após merge confirmado (§1) — **sem** depender de cliques do Rafael para rotina.

Gates G0–G4: [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md).

---

## 6. Roadmap de implementação (referência)

| Fatia | Tópico deste doc |
|-------|------------------|
| R4 | §1 webhook merge → `fixed` |
| R2 | CI acoplado ao defeito (complementa §1) |
| `ch-defect-recurrence` | §3 `parent_defect_id` + UI badge |

Detalhe de fatias R0–R4: [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md) §8.
