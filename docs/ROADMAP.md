# Roadmap AiyraCare

> **Fonte estruturada (UI + API):** [`roadmap.json`](./roadmap.json)  
> **Última revisão de prioridades:** 2026-08-12

Documento vivo para acompanhar épicos, pendências e debates. A página **Roadmap** no app lê o JSON via API.

## Princípios

1. **Postgres** é fonte da verdade; **Neo4j** projeta relações para caminhos e IA.
2. **Connect** extrai e normaliza; **Core** importa no domínio clínico ([CONNECT.md](./CONNECT.md)).
3. **Portais não trazem o grafo clínico** — associações são inferidas/confirmadas no app (`clinical_entity_links`).
4. **Resumo base** (`PatientContext`) permanece determinístico, sem LLM.

## Ordem de prioridade (resumo)

| Prioridade | Foco | Por quê agora |
|------------|------|----------------|
| **P0** | Sync silencioso (Connect) | Carteira atualizada sem intervenção; sessão estável + novidades discretas |
| **P1** | Sequência do cuidado + Neo4j | Estrutura consulta → autorização → exame; base para correlação |
| **P2** | Scheduler/worker, export médico, dados dos portais | Automação apartada + entrega na consulta |
| **P3** | OCR/LLM + agentes RAG | Inteligência com fontes citadas, após P1 |
| **P4** | Rede credenciada, mobile, microserviços | Horizonte de produto |

## Épicos

Detalhe completo (status, itens, notas): ver `roadmap.json` ou menu **Roadmap** no app.

**Sync delta (portal vs DB):** [`SYNC_DELTA.md`](./SYNC_DELTA.md)

**Categorias transversais:** `negocio` (produto/UX) e `tecnico` (arquitetura/dados) — tag nos épicos no JSON.

### P0 — Connect: sincronismo silencioso
- Pacote `@open-health/connect`, orchestrator, sessões Amil/Unimed ✅
- `sync_jobs` PG (só Postgres), novelty na UI, refresh CDP ✅
- Sync incremental Unimed/Amil/Mater Dei/Hermes em silent ✅
- Hardening sync (sessão, mutex, timeout browser) ✅
- SSE push-first ✅; intervenção só manual na Carteira ✅
- `skipped*` novelty todos portais ✅
- `trigger=scheduled` + script/loop local ✅

### P1 — Sequência do cuidado
- `relation_types`, `clinical_entity_links`, UI Acompanhamento ✅
- Trilhas no context (`activeThreads`, pendências de acompanhamento) ✅
- Polish UX sequência + picker tabulado nos modais ✅

### P1 — Grafo Neo4j
- Projector links + Hypothesis MVP ✅
- Worker lineage, path queries 🔜

### P2 — Scheduler e worker
- `trigger=scheduled` + `run-scheduled-syncs.mjs` + loop API ✅
- `packages/connect-worker` (runner apartado) ✅
- Eventos `sync.completed` (SSE por paciente) ✅

### P2 — Contexto + export médico
- Context API + UI ✅
- Export resumido (imprimir/PDF via context) ✅
- Export completo, compartilhamento 🔜

### P2 — Integrações (dados)
- Unimed/Amil core ✅
- Utilização Amil, carências Unimed PDF, Bradesco, Mater Dei 🔜

### P3 — Documentos OCR/LLM
- Identidade + cascade ✅
- Manuscrito, métricas 🔜

### P3 — Agenda / Calendário (categoria **Negócio**)
- Avaliar Linha do Tempo como sub-visão de Agenda/Calendário 🔜
- UX calendário (pegada Google): eventos clínicos + entradas programadas («Agendar neurologista») 🔜
- Integração Google Calendar, Microsoft Outlook; sync bidirecional (fase 2) 🔜

### P3 — Agentes
- RAG com citações, `packages/agents` 🔜

### P4 — Rede credenciada + plataforma
- “Decolar” da saúde, mobile, charts, microserviços 🔜

## Como atualizar

1. Editar `docs/roadmap.json` (status: `done` | `in_progress` | `planned` | `blocked`).
2. Ajustar `updatedAt` e este arquivo se mudar prioridades.
3. Commit — a UI reflete na próxima carga da página.

Relacionado: [PROJETO.md](./PROJETO.md) (arquitetura), [HISTORICO.md](./HISTORICO.md) (sessões), [CONNECT.md](./CONNECT.md) (boundary integrações).
