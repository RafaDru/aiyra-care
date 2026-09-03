# Higienização — arestas DUPLICATE_CANDIDATE no Neo4j

| Campo | Valor |
|-------|--------|
| **ID** | `hygiene-neo4j-candidate` |
| **Épico** | `data-hygiene-dedup` |
| **Status** | `done` |
| **Categoria** | técnico |
| **Prioridade** | P2 |

## Resumo

Quando o detector de higienização encontra possível duplicata (exame ou vacina), projeta uma aresta `DUPLICATE_CANDIDATE` no Neo4j. Ao resolver como “mesma entidade”, cria `CANONICAL_SAME_AS` e remove a candidata. **Postgres continua autoritativo.**

## Objetivo de negócio

- Visualização em **Encadeamento** / analytics de associações.
- Suporte à deduplicação estilo “Google Photos” sem duplicar dados clínicos no grafo.

## Comportamento

1. Scan semanal ou pós-import detecta par candidato.
2. Usuário resolve na UI (mesma entidade / não duplicata / dispensar).
3. Grafo atualizado de forma assíncrona (`NEO4J_SYNC_ENABLED=1`).

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Projector | `hygiene-graph.projector.ts` |
| Scheduler | `hygiene-graph.ts` |
| Detector | `hygiene-detector.service.ts` |
| Resolve | `hygiene.service.ts` |
| Testes | `hygiene-graph.projector.test.ts` |

## Ver também

- [`docs/DATA_HYGIENE.md`](../DATA_HYGIENE.md)
- [`docs/ARCHITECTURE_DATA_LAYERS.md`](../ARCHITECTURE_DATA_LAYERS.md)
