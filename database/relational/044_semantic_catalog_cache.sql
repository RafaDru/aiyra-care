-- Migration 044: Dynamic Semantic Catalog Cache
-- Stores auto-categorized semantic labels learned via LLM / vector feedback loop.

CREATE TABLE IF NOT EXISTS semantic_catalog_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(64) NOT NULL DEFAULT 'health_label',
  raw_label TEXT NOT NULL,
  normalized_label TEXT NOT NULL,
  kind VARCHAR(50) NOT NULL,
  destination VARCHAR(50) NOT NULL,
  canonical_name TEXT,
  catalog_id VARCHAR(100),
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.90,
  source_method VARCHAR(32) NOT NULL DEFAULT 'llm',
  times_hit INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_semantic_cache_domain_norm UNIQUE (domain, normalized_label)
);

CREATE INDEX IF NOT EXISTS idx_semantic_cache_domain_norm ON semantic_catalog_cache (domain, normalized_label);
