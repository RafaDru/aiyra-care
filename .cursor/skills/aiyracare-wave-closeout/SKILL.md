---
name: aiyracare-wave-closeout
description: Close a Project wave (AC-n queue): superseded PRs, notes.md pattern, HISTORICO, short report. Use when finishing a coordinated wave or sprint—not for single-feature tier review (use aiyracare-feature-release).
---

# AiyraCare — Wave closeout

Coordination ritual after a **wave** (several PRs / AC items) lands or is superseded. Read [`docs/CURSOR_WORK_MODEL.md`](../../docs/CURSOR_WORK_MODEL.md) and Project **`notes.md`** (format v2, prefix `AC`).

Charter: [`docs/OPS_SOLO_OPERATOR_CHARTER.md`](../../docs/OPS_SOLO_OPERATOR_CHARTER.md) — agents execute; Rafael only for strategic holds.

## When to use (vs other skills)

| Situation | Skill |
|-----------|--------|
| Wave done: reconcile queue, PRs, docs tracking | **This skill** |
| One feature: tier 0–3, legal/medical/security/business reviews | **`aiyracare-feature-release`** (+ review skills) |
| Go-live beta pillars, human vs agent split | **`aiyracare-mvp-go-live`** |
| Notebook E2E after merge (tier ≥1 DoD) | **`aiyracare-qa-notebook`** |

Do **not** run feature-release reviews for every wave closeout—only for changes still in flight that need tier gates.

## Checklist

### 1. Inventário da wave

- [ ] List AC items touched (Project **`notes.md`**: `For Review` → `Done`).
- [ ] Confirm each merged PR on `main` (or explicitly cancelled).
- [ ] Read [`docs/FOCO_ATUAL.md`](../../docs/FOCO_ATUAL.md) — update if frentes/priorities shifted.

### 2. PRs superseded / obsoletas

- [ ] Identify open PRs replaced by a newer branch or duplicate scope.
- [ ] Close with a short comment (link to winning PR or reason: superseded by #NNN).
- [ ] Do **not** merge stale PRs to “clean up”—close only.

### 3. Atualizar `notes.md` (pattern)

Project store **`notes.md`** (YAML frontmatter + `## Tasks`):

- [ ] **For Review:** remove or uncheck items now **Done**.
- [ ] **Done:** add lines like  
  `- [x] **AC-n** {título curto} [#PR](url) #produto` ou `#ops`  
  (optional worker link `[título](bc-…)` while in flight).
- [ ] Keep **one lane tag** per task (`#produto` | `#ops` | `#mobile`).
- [ ] Leave **AC-1** (paste Automation) in For Review until human completes—do not mark Done agentically.

### 4. Repo docs (when wave changed product/ops truth)

- [ ] Decisions → one block in [`docs/HISTORICO.md`](../../docs/HISTORICO.md) (date + bullets).
- [ ] Roadmap/features if status changed → [`docs/roadmap.json`](../../docs/roadmap.json), feature cards (bootstrap ritual).
- [ ] [`docs/FOCO_ATUAL.md`](../../docs/FOCO_ATUAL.md) if “próximo trabalho” list changed.

### 5. Relatório curto (chat / coordinator)

Output template:

```markdown
## Wave closeout — {título}
- **Merged:** #…, #…
- **Closed (superseded):** #…
- **notes.md:** AC-… → Done
- **HISTORICO / FOCO:** sim | não
- **Open / blocked:** AC-… (motivo)
- **Next:** (filas Queued ou notebook QA)
```

## Lanes (reminder)

| Tag | Closeout extras |
|-----|-----------------|
| `#produto` | If tier ≥1 merged, queue **`aiyracare-qa-notebook`** on My Machines—Cloud pre-flight alone is not DoD. |
| `#ops` | If CH/pipeline touched, note `test:ops` / smoke status. |

## References

- Fluxo: [`docs/CURSOR_WORK_MODEL.md`](../../docs/CURSOR_WORK_MODEL.md)
- Paralelo: [`docs/PARALLEL_WORK.md`](../../docs/PARALLEL_WORK.md)
- Delivery: [`docs/DELIVERY_PIPELINE.md`](../../docs/DELIVERY_PIPELINE.md)
