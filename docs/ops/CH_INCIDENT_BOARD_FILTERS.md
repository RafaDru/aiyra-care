# CH — Filtros da tab Incidentes

**Canônico:** `packages/api/src/domain/ops/incident-list-filter.ts` · labels em `packages/ops-console/src/client/ch-incident-board-filter.ts`

**Default UI:** **`all_open`** — chip **Em aberto** (2026-10-04).

---

## Chips e semântica

| Chip (UI) | `filter` PG/API | O que entra |
|-----------|-----------------|-------------|
| **Em aberto** | `all_open` | Fila **ativa** (dispatch/triagem): mesmo recorte que **Precisam atenção** — **não** inclui `triaged` nem `resolved` (ver chips **Triados** / **Resolvidos**). |
| **Precisam atenção** | `needs_attention` | Fila ativa de dispatch/triagem: **não** `triaged` / `resolved` / `dismissed`; legado **não** `completed` / `dismissed`. |
| **Triados** | `triaged` | `incident_pipeline_status = 'triaged'` apenas. |
| **Resolvidos** | `resolved` | `incident_pipeline_status = 'resolved'` apenas. |

**Descartados** (`dismissed`): não têm chip; ficam fora de **Em aberto** e **Precisam atenção**. Deep link com `ensureId` ainda pode exibir a linha.

---

## Status de pipeline por filtro (válidos)

| `incident_pipeline_status` | Em aberto | Precisam atenção | Triados | Resolvidos |
|----------------------------|:---------:|:----------------:|:-------:|:----------:|
| `open` | ✓ | ✓ | | |
| `queued_worker` | ✓ | ✓ | | |
| `forwarded` | ✓ | ✓ | | |
| `in_triage` | ✓ | ✓ | | |
| `dispatch_failed` | ✓ | ✓ | | |
| `triaged` | | | ✓ | |
| `resolved` | | | | ✓ |
| `dismissed` | | | | |

Tag na coluna **Status** vem de `incidentPipelineLabel()` — deve coincidir com a coluna pipeline (ex.: **Triado** só no filtro Triados ou Em aberto, nunca em Resolvidos).

---

## Legado `status` (fila agente)

Não define o chip do pipeline; só detalhe expandido e regra de exibição **Em triagem** (`investigating` / `fix_proposed`). Filtros usam **pipeline** como fonte primária; `needs_attention` e `all_open` excluem legado `completed` / `dismissed` onde aplicável.

---

## Deep link

`?tab=incidentes&investigationId=` → `suggestIncidentBoardFilter(item)` escolhe o chip ao abrir.

---

## QA

`docs/testing/suites/ops-ch-defeitos.md` — passos de filtro e status.
