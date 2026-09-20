# Playbook — Backend task handoff (Claude → Cursor)

Webhook `backend_task_handoff` — lane **integração pós-backend**.

**Setup na conta Cursor (uma vez):** não há import JSON — cole o prompt de `.cursor/automations/backend-task-cursor-handoff.yaml` numa Automation webhook; secrets `CURSOR_BACKEND_HANDOFF_WEBHOOK_*` — ver `docs/coordination/CURSOR_RETURN_PATH.md`.

## Entrada

JSON com `taskId`, `prUrl`, `prNumber`, `branch`, `queueStatus`, `trigger`.

## Passos

1. `git fetch` + checkout PR branch ou review via `gh pr diff`.
2. Ler `docs/coordination/BACKEND_TASK_QUEUE.md` na linha do `taskId`.
3. Verificar escopo: apenas pacotes backend permitidos (`CLAUDE_CODE_PARTNERSHIP.md`).
4. `gh pr checks` / CI — deve estar verde.
5. Se **só teste smoke / docs / migration segura**: `gh pr merge --squash` (draft → ready se necessário).
6. Se **contrato HTTP ou `packages/web` necessário**: não mergear; commit na fila nota `blocked` ou nova linha `queued` para Cursor UI; corpo do PR com checklist.
7. Após merge: atualizar fila `done` + PR link; `npm run test:critical` se tocou API.

## Não fazer

- Pedir confirmação ao Rafael em tarefas smoke/tier-0 acordadas.
- Mergear se CI vermelho ou diff em `packages/web` sem spec.
