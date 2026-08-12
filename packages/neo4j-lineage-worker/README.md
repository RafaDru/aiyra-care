# Neo4j lineage worker

Projeta `import_raw_records` processados no Neo4j (exames, consultas, autorizações, médicos, procedimentos).

Requer `NEO4J_SYNC_ENABLED=1` e Neo4j acessível (`NEO4J_URI`, credenciais).

## Scripts

```bash
npm run neo4j-lineage-worker          # loop (NEO4J_LINEAGE_INTERVAL_MS, default 5 min)
npm run neo4j-lineage-worker:once     # um batch incremental
npm run neo4j-lineage-worker:backfill # full backfill (opcional: patient UUID)
```

## Cursor

Tabela `neo4j_projection_state` (migration `025_neo4j_projection_state.sql`).

Variáveis: `NEO4J_LINEAGE_BATCH_SIZE` (default 100), `NEO4J_LINEAGE_INTERVAL_MS` (default 300000).
