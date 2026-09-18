# Parceria Cursor (produto + interfaces) × Claude Code (núcleo backend)

> **Decisor:** Rafael · **2026-09-18** · Modelo operacional **variante A** (ver Project store `docs/multi-agent-dev-split-analysis.md`)

## Objetivo

Usar o **Claude Code com capacidades completas** (terminal, multi-arquivo, testes, sessões longas) como **implementador do núcleo servidor**, enquanto o **Cursor Project** coordina produto, contratos HTTP, todas as interfaces (web, app quando retomar, Ava na web, canais futuros), ops ritual e QA.

Não é “chat Sonnet avulso”: é **fila de tarefas backend** + handoff via **mesmo monorepo** e **PRs**.

## Divisão de responsabilidade

| Dono | Escopo | Pacotes típicos |
|------|--------|-----------------|
| **Cursor** | Roadmap, feature cards, DTOs/rotas acordadas, `packages/web`, ops-console, suites QA, reviews segurança/LGPD | `packages/web`, rotas finas em `packages/api` quando contrato muda, `docs/features/*` |
| **Claude Code** | Domínio, aplicação, infra, migrations, workers, agents Python | `packages/api` (domain/application/infrastructure), `packages/connect*`, `packages/connect-worker`, `packages/neo4j-lineage-worker`, `packages/agents/*` |
| **Rafael** | Merge, promoção A1→A2, exceções de contrato | — |

**Proibido:** API paralela “só app”; duplicar lógica que já existe para a web sem passar pelo BFF único (`docs/ARCHITECTURE_DATA_LAYERS.md`, princípio BFF no Project store).

## Fila de tarefas (acionamento ativo)

Canal canônico no repo:

- **Fila:** [`docs/coordination/BACKEND_TASK_QUEUE.md`](./coordination/BACKEND_TASK_QUEUE.md)
- **Formato de id:** `TASK-YYYYMMDD-NN` (ex. `TASK-20260918-01`)

### Cursor → Claude (nova tarefa)

1. Cursor adiciona linha na fila: `queued` + link da spec (feature card / issue / ADR).
2. Opcional: issue GitHub com label `backend:claude` e mesmo `TASK-*` no título.
3. Spec mínima: objetivo, rotas/contratos afetados, migrations?, testes esperados (`test:critical` / vitest paths).

### Claude Code → Cursor (encerramento / sinalização)

Ao **iniciar:** marcar fila `in_progress` + branch `feat/backend-TASK-…`.

Ao **concluir:** PR draft no GitHub com:

- Título: `[TASK-…] …`
- Corpo: o que mudou, migrations, como testar, **bloqueios** para web/ops.
- Atualizar fila: `done` + link PR; ou `blocked` + motivo.

Ao **precisar de decisão de produto/contrato:** fila `blocked` + comentário na issue; Cursor responde na fila ou issue — não inventar contrato.

### Ritmo orgânico

- Claude puxa próxima tarefa `queued` (topo da fila) quando idle.
- Cursor não implementa o mesmo `TASK-*` em paralelo.
- Conflito de merge: quem chegou segundo rebase; Cursor ajuda em contrato se necessário.

## Comunicação “ótima” (o que o coordinator precisa saber)

| Evento | Claude Code registra |
|--------|----------------------|
| Começou | `in_progress`, branch, estimativa de escopo |
| Contrato incerto | `blocked` + pergunta concreta |
| PR aberto | `review` + URL + checklist testes |
| Merged (Rafael) | `done` — Cursor atualiza web/QA se necessário |
| Descoberta de segurança/LGPD | `blocked` + severidade; não mergear sem alinhamento |

## Referências obrigatórias (sessão Claude)

1. Este arquivo
2. [`docs/coordination/BACKEND_TASK_QUEUE.md`](./coordination/BACKEND_TASK_QUEUE.md)
3. [`docs/AGENT_BOOTSTRAP.md`](./AGENT_BOOTSTRAP.md)
4. Feature card da tarefa em `docs/features/`
5. Hexagonal: `packages/api` domain → application → infrastructure

## Mobile

Até decisão contrária de Rafael: `packages/mobile` pode continuar com Claude Code; **mesmo BFF** que a web. Novas rotas servem web + app.

## Histórico

- 2026-09-18 — modelo fila + variante A (Rafael + Cursor Project)
