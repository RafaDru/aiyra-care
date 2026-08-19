# Higienização de dados clínicos (deduplicação)

> **Última atualização:** 2026-08-18  
> Modelo inspirado em **Google Photos** (“é a mesma pessoa?”).  
> Relacionado: `docs/AVA_VISION.md`, `docs/ARCHITECTURE_DATA_LAYERS.md`

## Problema

Sync de vários portais (Unimed, Hermes, Mater Dei, manual) gera:

- Exames/consultas/autorizações **duplicadas** ou quase idênticas.
- Timeline e contexto Ava **inflados** (tokens, confusão).
- Grafo Neo4j com nós redundantes.

Dedup na **importação** (`skippedExams`, etc.) não cobre todos os casos cross-source e revisão posterior.

## Princípios

1. **Nunca** merge destrutivo sem confirmação do usuário.
2. PG mantém entidades; Neo4j registra **associação** `DUPLICATE_CANDIDATE` / `CANONICAL_SAME_AS` após decisão.
3. “Mesmo registro” vs “fontes distintas da mesma entidade real” — UX clara.

## Três camadas (decisão de produto)

### 1. Na inserção (sync / upload / manual)

```text
Novo registro → detector (regras + score)
  → score alto: modal/toast "Parece igual a X"
  → [Mesmo registro | São diferentes | Revisar depois]
```

**Regras iniciais (exemplos):**

| Tipo | Heurística |
|------|------------|
| Exame Hermes | `portal_order_label`, `id_pedido`, data + tipo |
| Exame genérico | mesma `patient_id`, `exam_date`, `exam_type`, lab similar |
| Consulta | mesma data + médico + especialidade |
| Autorização | código/token guia |
| Vacina genérica | mesma data + nome normalizado ou slot catálogo (conferência) |

Persistência planejada: `hygiene_candidates` (PG) com `entity_type`, `entity_id_a`, `entity_id_b`, `score`, `status`, `detector`.

### 2. Varredura semanal (job)

- Batch por conta: todos os pares plausíveis não decididos.
- Alimenta a mesma fila; não altera dados automaticamente.
- Worker: `packages/connect-worker` ou script agendado na API.

### 3. Proativo no login

- “Encontramos N possíveis duplicatas” → UI lado a lado (Photos-style).
- Dismiss = “não é duplicata” (não re-promptar; opcionalmente aresta `NOT_DUPLICATE` no grafo).

## Neo4j

- Candidato: `(Exam)-[:DUPLICATE_CANDIDATE {score, detector}]->(Exam)`
- Confirmado merge: link canônico em PG (`clinical_entity_links` ou `merged_into_id`) + aresta `SAME_AS` no grafo.
- Ava: pins apontam sempre ao **nó canônico** após merge.

## Impacto na Ava

- Menos ruído no `buildContextBlock` / pins.
- Painel de contexto lista entidades **únicas**.
- Métrica: tokens por turno ↓ após higienização.

## LGPD

- Decisão de merge auditada (`hygiene_decisions` ou evento em fila).
- Export mostra histórico de merges se aplicável.

## Roadmap

Épico `data-hygiene-dedup` em `docs/roadmap.json`.

## Estado atual (2026-08-19)

### Implementado (MVP)

- Migration `042_hygiene_candidates.sql` + `apply-migration-042.mjs`
- Detectores de exame: `exam_dedup_key`, `exam_date_type_lab`, `exam_date_type`, `exam_date_result`, `exam_pedido_type`
- Detectores de vacina: `vaccine_catalog_slot`, `vaccine_date_catalog_dose`, `vaccine_date_name`, `vaccine_date_catalog`
- Scan vacinas após create + varredura batch (`scanPatient` exames + vacinas)
- Import ConecteSUS/manual: `ExamService`/`VaccineService` bloqueiam duplicata alta confiança (score ≥ 88)
- Listagens API e timeline ocultam registros com `hygieneCanonicalId`
- API: `GET /hygiene/candidates`, `POST /hygiene/candidates/:id/resolve`
- Scan após create de exame manual e após sync (warning no job se há candidatos)
- Script: `npm run scan:hygiene` (`run-hygiene-scan.ts`)
- Resolve `same_entity`: marca `hygieneCanonicalId` em notes meta do duplicata (sem merge físico ainda)
- Motor de artefatos ignora duplicatas: `exam-canonical.ts`, `glucose-exam-import`, `exam-artifact-normalization.service.ts`

### Pendente

- UI Photos-style no login (`hygiene-login-ui`)
- Job semanal agendado (`connect-worker` ou cron API)
- Arestas Neo4j `DUPLICATE_CANDIDATE` / merge físico de documentos
- Consultas, autorizações, vacinas (só exames hoje)
- Auditoria dedicada `hygiene_decisions`
