# Arquitetura de dados — Postgres vs Neo4j

> **Última atualização:** 2026-08-18  
> Relacionado: `docs/AVA_VISION.md`, `docs/project-context.json`, migration `025_neo4j_projection_state.sql`

## Princípio (decisão de arquitetura)

| Camada | Responsabilidade |
|--------|------------------|
| **PostgreSQL** | **Entidades** (atributos, estado, auditoria, billing, LGPD) e **relacionamentos internos** que são regra de negócio (FK, `clinical_entity_links`, memberships). |
| **Neo4j** | **Associações** entre entidades já existentes no PG — rede navegável, expansão de contexto, higienização candidata, sessão Ava — sem duplicar o prontuário como fonte de verdade. |

Neo4j é **read-model + associação quente**, não substituto do Postgres.

```text
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL — fonte da verdade                              │
│  patients, exams, records, threads, documents, billing,     │
│  ava_conversations (futuro), pins, hygiene_queue (futuro)   │
└───────────────────────────┬─────────────────────────────────┘
                            │ projeção / sync de IDs
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Neo4j — associações e caminhos                             │
│  (:Patient)-[:HAS_RECORD]->(:Exam)                           │
│  (:Conversation)-[:CONTEXT_PIN]->(:Exam)  (futuro)          │
│  (:Exam)-[:SAME_AS_CANDIDATE]->(:Exam)    (higienização)     │
│  (:Topic)-[:MENTIONED_IN]->(:Conversation) (analytics opt-in)│
└─────────────────────────────────────────────────────────────┘
```

## O que fica **só** no Postgres

- Identidade: `app_accounts`, `patient_memberships`, perfil.
- Clínico: exames, consultas, vacinas, meds, alergias, diagnósticos, autorizações.
- Trilhas: `health_threads`, entries, links (`clinical_entity_links`).
- Documentos, OCR, interpretação manuscrito.
- Billing, entitlements, compras Stripe.
- Legal: aceites, documentos versionados.
- **Conversas Ava** (planejado): mensagens, pins de sessão, consentimentos.
- **Telemetria operacional**: `llm_usage_events`, `sync_jobs`, eventos de produto (planejado).
- **Fila de higienização** (planejado): candidatos a merge, decisão do usuário.

Atributos de entidade (datas, textos, URLs GCS, status) **nunca** são authoritative no Neo4j — só espelho mínimo para query (`id`, `type`, `title`, `eventDate`, `source`).

## O que o Neo4j faz bem

| Uso | Exemplo |
|-----|---------|
| Caminhos clínicos | consulta → autorização → exame (já: `clinical-paths`) |
| Multi-hop em UI | Encadeamento na timeline |
| **Pins de sessão Ava** | conversa ligada a N pacientes, exames, threads |
| **Higienização** | candidato `DUPLICATE_CANDIDATE` entre dois `Exam` |
| **Analytics (opt-in)** | tópico agregado ligado a conversas, sem texto bruto em dashboards |
| Sugestão de contexto | “exame X também no thread de alergia familiar” |

## Projeção PG → Neo4j (estado atual)

- `NEO4J_SYNC_ENABLED=1` — após sync/import, workers projetam entidades e lineage.
- `import-lineage-graph`, `canonical-entity-graph`, health thread links.
- Leitura: `GET /patients/:id/graph/clinical-paths`, `/timeline/graph` (se `NEO4J_READ_ENABLED`).

**Regra:** alteração clínica → PG primeiro; grafo atualizado por worker (assíncrono). UI crítica não depende só do grafo.

## Associações “no hot” (futuro Ava)

Quando o usuário ou a Ava **associa** entidades na sessão:

1. **PG** — `ava_session_context` (pin: `entity_type`, `entity_id`, `active`, `source`).
2. **Neo4j** — aresta `(:AvaConversation)-[:PINNED {at, source}]->(:Exam|:HealthThread|:Patient)` com os mesmos IDs PG.

Prompt da Ava: montado a partir dos **pins PG**; Neo4j opcional para expandir 1–2 hops (“incluir exame relacionado?”).

## ML / NLP e o grafo

- **Não** treinar modelos no Neo4j como datastore principal.
- **Sim** usar o grafo como **feature store de relações** para jobs batch (opt-in): cohorts, temas, padrões de pin.
- Entidades e texto sensível permanecem no PG com política de retenção LGPD.

## Falha e recuperação

- Neo4j indisponível: Ava e app **degradam** (pins PG + prontuário PG); grafo UI mostra aviso.
- Rebuild: scripts `neo4j-lineage-worker:backfill` a partir de `import_raw_records` + entidades PG.

## Referências de código

| Área | Path |
|------|------|
| Query grafo clínico | `packages/api/src/infrastructure/graph/clinical-graph-query.service.ts` |
| Projeção canônica | `packages/api/src/infrastructure/graph/canonical-entity-graph.ts` |
| Env flags | `packages/api/src/infrastructure/graph/neo4j-env.ts` |
| Links PG | `clinical_entity_links`, `relation_types` |
