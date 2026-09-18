# Fila — backend (Claude Code)

> **Canônico no GitHub `main` após merge.** Se existir cópia local só no worker Claude, reconciliar com este arquivo (não manter duas filas ativas).

Status: `queued` → `in_progress` → `review` → `done` | `blocked` | `cancelled`

| ID | Status | Spec | Branch | PR | Notas |
|----|--------|------|--------|-----|-------|
| TASK-20260918-03 | cancelled | Webhook secret verify (CURSOR_BACKEND_HANDOFF_*) | task/20260918-03-webhook-secret-verify | [#41](https://github.com/RafaDru/aiyra-care/pull/41) (draft) | 2026-09-18 secrets OK: Actions `notify-cursor-pr` curl 2xx; automation `AiCare - Backend handoff`; bc `bc-4ca65383`. Não mergear — só smoke. |
| TASK-20260918-02 | done | [Handoff smoke cycle 2](docs/coordination/CURSOR_RETURN_PATH.md) | cursor/handoff-smoke-cycle-2-f954 | [#35](https://github.com/RafaDru/aiyra-care/pull/35) | Merge 2026-09-18; webhook 2xx (`bc-ed879241`); vitest 3/3; smoke cycle 2 PASS. |
| TASK-20260918-01 | done | [Smoke fila](docs/CLAUDE_CODE_PARTNERSHIP.md) | task/20260918-01-coordination-queue-smoke | [#32](https://github.com/RafaDru/aiyra-care/pull/32) | Merge 2026-09-18; vitest smoke 1/1. |
| — | — | — | — | — | *—* |

## Regras

- **Cursor** insere novas linhas no topo (abaixo do cabeçalho); salvar dispara watcher Claude.
- **Claude Code** atualiza Status, Branch, PR, Notas; PR draft + notificação Cursor ao `review`.
- **Rafael** merge; Claude marca `done`.
