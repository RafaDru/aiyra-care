# Fila — backend (Claude Code)

> **Canônico no GitHub `main` após merge.** Se existir cópia local só no worker Claude, reconciliar com este arquivo (não manter duas filas ativas).

Status: `queued` → `in_progress` → `review` → `done` | `blocked` | `cancelled`

| ID | Status | Spec | Branch | PR | Notas |
|----|--------|------|--------|-----|-------|
<<<<<<< HEAD
| TASK-20260918-01 | queued | [Smoke fila](docs/CLAUDE_CODE_PARTNERSHIP.md) | — | — | Criar `packages/api/tests/coordination-queue-smoke.test.ts`: 1 teste vitest que o arquivo `docs/coordination/BACKEND_TASK_QUEUE.md` existe no monorepo. PR draft `[TASK-20260918-01]` + fila `review` + ping Cursor CLI. |
=======
| TASK-20260918-01 | review | [Smoke fila](docs/CLAUDE_CODE_PARTNERSHIP.md) | task/20260918-01-coordination-queue-smoke | [#32](https://github.com/RafaDru/aiyra-care/pull/32) | Teste vitest passou (1/1). PR draft aberto — aguardando review/merge do Rafael. |
>>>>>>> origin/main
| — | — | — | — | — | *—* |

## Regras

- **Cursor** insere novas linhas no topo (abaixo do cabeçalho); salvar dispara watcher Claude.
- **Claude Code** atualiza Status, Branch, PR, Notas; PR draft + notificação Cursor ao `review`.
- **Rafael** merge; Claude marca `done`.
