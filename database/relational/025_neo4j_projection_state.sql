-- Cursor para worker de projeção Neo4j (import_raw_records → grafo)
CREATE TABLE IF NOT EXISTS neo4j_projection_state (
  key TEXT PRIMARY KEY,
  last_raw_created_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO neo4j_projection_state (key)
VALUES ('import_lineage')
ON CONFLICT (key) DO NOTHING;
