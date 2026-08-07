-- Índice rápido de postos, clínicas e laboratórios para autocomplete e cruzamento futuro.
CREATE TABLE IF NOT EXISTS care_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_places_normalized_name ON care_places (normalized_name);
CREATE INDEX IF NOT EXISTS idx_care_places_display_name ON care_places (display_name);
