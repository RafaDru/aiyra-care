# Fila — backend (Claude Code)

> **Canônico no GitHub `main` após merge.** Se existir cópia local só no worker Claude, reconciliar com este arquivo (não manter duas filas ativas).

Status: `queued` → `in_progress` → `review` → `done` | `blocked` | `cancelled`

| ID | Status | Spec | Branch | PR | Notas |
|----|--------|------|--------|-----|-------|
| TASK-20260918-01 | in_progress | [Smoke fila](docs/CLAUDE_CODE_PARTNERSHIP.md) | task/20260918-01-coordination-queue-smoke | — | Claude Code detectou via fs.watch e pegou a tarefa (inline, sem conflito de recurso) |
| — | — | — | — | — | *—* |

## Regras

- **Cursor** insere novas linhas no topo (abaixo do cabeçalho); salvar dispara watcher Claude.
- **Claude Code** atualiza Status, Branch, PR, Notas; PR draft + notificação Cursor ao `review`.
- **Rafael** merge; Claude marca `done`.
