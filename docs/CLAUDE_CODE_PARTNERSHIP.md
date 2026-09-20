# Parceria Cursor (produto + interfaces) × Claude Code (núcleo backend)

> **Decisor:** Rafael · **2026-09-18** · Variante A  
> **Reconciliação:** versão canônica no GitHub após merge deste arquivo; se o checkout local divergir (ex. versão criada no worker Claude antes do push do Cursor), **diff contra `main`** e fundir seções — não duplicar filas.

## Objetivo

**Claude Code** usa capabilities completas (terminal, multi-arquivo, testes, worktrees, subagentes) no **núcleo servidor**. **Cursor Project** coordina produto, interfaces, contrato BFF, ops e QA.

Handoff: fila [`docs/coordination/BACKEND_TASK_QUEUE.md`](./coordination/BACKEND_TASK_QUEUE.md) + PRs `TASK-*`.

## Guard-rails de pacotes (pivot 2026-09-18, testado)

| Zona | Pacotes | Dono |
|------|---------|------|
| **Cursor** (Claude **não** edita) | `packages/web`, `packages/mobile`, `packages/api-sdk`, `packages/design-tokens` | Cursor |
| **Claude Code** | `packages/api`, `packages/contracts`, `packages/connect`, `packages/connect-worker`, `packages/neo4j-lineage-worker`, `packages/agents/*` | Claude Code |

Rotas HTTP finas / DTOs que afetam clientes: spec Cursor antes de merge backend.

## Gatilhos (tempo quase real)

### Cursor → Claude

1. Cursor (ou Rafael) adiciona linha `queued` em `BACKEND_TASK_QUEUE.md`.
2. **Watcher:** `fs.watch` no arquivo da fila (Monitor no ambiente Claude) — notificação em segundos ao salvar, mas só se o checkout local já tiver a mudança (depende de `git pull`).
3. **Sessão fechada:** hook de início de sessão Claude relê a fila e processa `queued` pendente.
4. **GitHub sem pull local:** `.github/workflows/queue-to-claude-routine.yml` dispara uma Claude Code Routine em qualquer push à fila em `main`; a Routine envia uma mensagem cross-session para a sessão `Desenvolvimento Backend` — funciona mesmo se ninguém tocar o checkout local. Ver [`CLAUDE_WAKE_PATH.md`](./coordination/CLAUDE_WAKE_PATH.md) (setup manual único pendente: criar a Routine + secrets no GitHub).

### Claude → Cursor

1. Atualizar status na fila (`in_progress` → `review` → `done` | `blocked`).
2. **PR draft** ao concluir (pré-autorizado; sem pedir confirmação a cada tarefa).
3. **Volta automatizada** (Rafael não opera GitHub):
   - GitHub Actions dispara webhook `backend_task_handoff` em PR `task/*` ou push da fila em `review` — ver [`CURSOR_RETURN_PATH.md`](./coordination/CURSOR_RETURN_PATH.md).
   - **Opcional redundante:** POST o mesmo JSON via CLI (`CURSOR_BACKEND_HANDOFF_WEBHOOK_*` = secrets do repo).
4. Cursor Automation «Backend handoff» revisa CI, merge tier-0, atualiza fila `done`.

## Checklist Claude ao pegar tarefa

1. Ler linha da fila + spec (`docs/features/…` / issue).
2. `git status` — contexto atual; não colidir com trabalho em andamento.
3. Escolher modo:
   - **inline** — mudança pequena no branch atual;
   - **subagente + worktree** — tarefa isolada, paralelizável;
   - **esperar** — só se conflito real de recurso (mesmo arquivo/domínio), marcar `blocked` com motivo.

## Divisão de responsabilidade

| Dono | Escopo |
|------|--------|
| **Cursor** | Roadmap, feature cards, UIs, ops-console, QA, contrato HTTP acordado |
| **Claude Code** | domain/application/infrastructure, migrations, workers, agents Python |
| **Rafael** | Merge, ambientes |

**Proibido:** API paralela só-app; duplicar domínio fora do BFF (`docs/ARCHITECTURE_DATA_LAYERS.md`).

## Formato de tarefa

- **Id:** `TASK-YYYYMMDD-NN`
- **Spec mínima:** objetivo, rotas/contratos, migrations?, testes (`test:critical` / vitest)

## Comunicação para o coordinator

| Evento | Registrar |
|--------|-----------|
| Início | `in_progress`, branch |
| Dúvida produto/contrato | `blocked` + pergunta única |
| PR | `review` + URL + testes rodados |
| Merge Rafael | `done` |
| LGPD/segurança | `blocked` + severidade |

## Referências (sessão)

1. Este arquivo  
2. [`BACKEND_TASK_QUEUE.md`](./coordination/BACKEND_TASK_QUEUE.md)  
3. [`AGENT_BOOTSTRAP.md`](./AGENT_BOOTSTRAP.md)  
4. Feature card da tarefa  

## Histórico

- 2026-09-18 — fila + variante A (Cursor Project, commit cloud)
- 2026-09-18 — guard-rails, `fs.watch`, checklist, notificação CLI (Claude Code, Rafael)
