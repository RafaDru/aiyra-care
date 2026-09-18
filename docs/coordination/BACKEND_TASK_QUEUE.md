# Fila — backend (Claude Code)

> **Canônico no GitHub `main` após merge.** Se existir cópia local só no worker Claude, reconciliar com este arquivo (não manter duas filas ativas).

Status: `queued` → `in_progress` → `review` → `done` | `blocked` | `cancelled`

| ID | Status | Spec | Branch | PR | Notas |
|----|--------|------|--------|-----|-------|
| TASK-20260918-02 | review | [Handoff smoke cycle 2](docs/coordination/CURSOR_RETURN_PATH.md) | cursor/handoff-smoke-cycle-2-f954 | — | E2E Actions→webhook→Cursor; vitest 3/3; tier-0. |
| TASK-20260918-01 | done | [Smoke fila](docs/CLAUDE_CODE_PARTNERSHIP.md) | task/20260918-01-coordination-queue-smoke | [#32](https://github.com/RafaDru/aiyra-care/pull/32) | Merge 2026-09-18; vitest smoke 1/1. |
| — | — | — | — | — | *—* |

## Regras

- **Cursor** insere novas linhas no topo (abaixo do cabeçalho); salvar dispara watcher Claude.
- **Claude Code** atualiza Status, Branch, PR, Notas; PR draft + notificação Cursor ao `review`.
- **Rafael** merge; Claude marca `done`.
