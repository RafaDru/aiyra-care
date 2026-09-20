# Coordenação multi-agente (Cursor × Claude Code)

Fila única de trabalho **backend** para o Claude Code:

- [`BACKEND_TASK_QUEUE.md`](./BACKEND_TASK_QUEUE.md)

Contrato geral: [`../CLAUDE_CODE_PARTNERSHIP.md`](../CLAUDE_CODE_PARTNERSHIP.md)

Volta automatizada (webhook + Automation): [`CURSOR_RETURN_PATH.md`](./CURSOR_RETURN_PATH.md)

O Cursor Project coordinator **escreve** tarefas `queued`; Claude Code **atualiza** status e liga PRs; a Automation «Backend handoff» pode mergear tier-0 sem Rafael na UI.
