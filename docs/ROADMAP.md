# Roadmap AiyraCare

> **Fonte estruturada (UI + API):** [`roadmap.json`](./roadmap.json)  
> **Última revisão de prioridades:** 2026-09-02

Documento vivo para acompanhar épicos, pendências e debates. A página **Roadmap** no app lê o JSON via API e organiza os épicos em três filas:

1. **Em execução** — foco atual do time (destaque na UI)
2. **Backlog** — priorizado, ainda não em desenvolvimento ativo
3. **Executado** — entregas compactas e expansíveis no final

Categorias no JSON: **Experiência da família** (`negocio`) vs **Por dentro do sistema** (`tecnico`) vs **Regulatório** (`regulacao`).

## Revisão humana / profissional (paralela)

Itens com `reviewBadge` no JSON aparecem com **tags coloridas** no Roadmap e na seção **Revisão humana pendente** (tecnologia pronta; falta parecer externo).

| Badge | Quem |
|-------|------|
| Jurídico | Advogado |
| Fiscal | Contador / Contabilizei |
| Regulatório | Consultor ANVISA / DPO |
| Médico | Pediatria / clínico |
| Segurança | Pentest / auditor |
| Conteúdo | Revisão de textos |

Épico agregador: `human-review-gates`. Índice com artefatos: [`HUMAN_REVIEW_QUEUE.md`](./HUMAN_REVIEW_QUEUE.md).

## Princípios

1. **Postgres** é fonte da verdade; **Neo4j** projeta relações para caminhos e IA.
2. **Connect** extrai e normaliza; **Core** importa no domínio clínico ([CONNECT.md](./CONNECT.md)).
3. **Portais não trazem o grafo clínico** — associações são inferidas/confirmadas no app (`clinical_entity_links`).
4. **Resumo base** (`PatientContext`) permanece determinístico, sem LLM.

## Ordem de prioridade (resumo)

| Prioridade | Foco | Estado (2026-08-13) |
|------------|------|---------------------|
| **P0** | Sync silencioso (Connect) | ✅ Entregue |
| **P1** | Sequência do cuidado + Neo4j | ✅ Entregue |
| **P2** | Scheduler, export, integrações, billing, legal tech, settings, **ambientes** | Código entregue em parte; gates humanos + **platform-environments** em estruturação |
| **P3** | OCR/LLM ✅ · Agenda ✅ · **Agentes RAG** · **B2B discovery** | Próximo épico produto + parceiros |
| **P4** | Rede credenciada, mobile, microserviços | Horizonte |

## O que está disponível hoje (produto)

### Família (negócio)

- Perfil paciente: Carteira (sync silencioso), Convênios, Integrações, Resumo clínico, Linha do tempo / Encadeamento, Acompanhamento, Arquivos, Medidas, **Agenda** (calendário + lista + histórico).
- Export clínico resumido/completo, impressão/PDF, **compartilhar com médico** (link 48h).
- **Agenda programada** + import ICS; **Google Calendar** e **Outlook** OAuth (sync bidirecional calendário principal).
- **Configurações:** Geral (tema/idioma), Conta (perfil, exclusão), Plano (Stripe), Legal (aceites, go-live, DPO).

### Sistema (técnico)

- Connect: Unimed, Amil, Mater Dei, Hermes (delta silent), Bradesco; worker agendado; SSE progresso + sync.completed.
- Sequência clínica (`clinical_entity_links`); Neo4j lineage + path queries.
- Billing: créditos manuscrito, checkout Stripe, assinatura família, webhook, portal cliente.
- Legal: compliance gate, 4 documentos versionados, cookies, consentimento menor, exclusão LGPD.

### Pendente antes de go-live público

Ver épico `human-review-gates`: advogado, NFS-e, Stripe live, DPO operacional, revisão médica copy export/OCR, pentest tier 3.

## Épicos — status

Detalhe completo (status, itens, notas): ver `roadmap.json` ou menu **Roadmap** no app.

**Sync delta:** [`SYNC_DELTA.md`](./SYNC_DELTA.md)

### ✅ P0 — Connect silencioso

Pacote connect, orchestrator, sessões, incremental, SSE, novelty, worker, hardening.

### ✅ P1 — Sequência + Neo4j

`clinical_entity_links`, UI Acompanhamento, trilhas no context, lineage worker, timeline Encadeamento.

### ✅ P2 — Automação e entrega

- Scheduler + `connect-worker` + `sync.completed` SSE
- Context + export + share
- **Site institucional** `/home` — épico `institutional-landing` (v1 placeholder + tracking)
- Integrações enriquecidas (Amil utilização, Unimed PDF, Bradesco, assets)
- Billing Stripe + export Contabilizei + GCP alerts doc
- Legal/LGPD (código) + feature review framework
- Settings `/settings/*` + conta/plano separados

### ✅ P3 — Agenda / calendários

`scheduled_events`, ICS, Google OAuth, Microsoft Outlook OAuth, UX calendário na Agenda.

### ✅ P3 — Documentos OCR/LLM (código)

Cascade OCR, manuscrito, métricas OCR — revisão médica disclaimers = human gate.

### 🔜 P2 — Ambientes (pré-CNPJ)

Épico `platform-environments` — **completo** (ENVIRONMENTS, seeds, staging CI, probe gate, BACKUP, DEPLOY_STAGING).

### 🔜 P3 — Ecossistema e B2B

`business-ecosystem` — [`ECOSYSTEM.md`](./ECOSYSTEM.md) (personas, marketplace farmácias horizonte). `b2b-partner-platform` — [`B2B_PARTNERS.md`](./B2B_PARTNERS.md).

### 🔜 P3 — B2B parceiros (discovery)

### 🔜 P3 — Agentes RAG (próximo)

Runtime + `packages/agents` + grafo — **não iniciar** sem gate ANVISA + revisão médica.

### 🔜 P4 — Horizonte

Rede credenciada, app mobile, microserviços Connect, novos tipos Medidas.

### 🧑‍⚖️ Paralelo — human-review-gates

Tecnologia pronta; falta profissional externo.

## Como atualizar

1. Editar `docs/roadmap.json` (status: `done` | `in_progress` | `planned` | `blocked`).
2. Ajustar `updatedAt` e este arquivo se mudar prioridades.
3. Registrar sessão em `docs/HISTORICO.md`.
4. Commit — a UI reflete na próxima carga da página.

Relacionado: [PROJETO.md](./PROJETO.md), [HISTORICO.md](./HISTORICO.md), [CONNECT.md](./CONNECT.md), [ACCOUNT_AND_PLAN.md](./ACCOUNT_AND_PLAN.md), [LEGAL_COMPLIANCE.md](./LEGAL_COMPLIANCE.md).
