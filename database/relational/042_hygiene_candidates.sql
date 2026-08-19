-- Higienização de dados: candidatos a duplicata (estilo Google Photos)
-- Entidades canônicas permanecem no Postgres; decisão do usuário antes de merge.

CREATE TABLE IF NOT EXISTS hygiene_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  entity_type VARCHAR(32) NOT NULL,
  entity_id_a UUID NOT NULL,
  entity_id_b UUID NOT NULL,
  detector VARCHAR(64) NOT NULL,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'same_entity', 'distinct', 'dismissed')),
  evidence JSONB NOT NULL DEFAULT '{}',
  resolved_by UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hygiene_candidates_pair_order CHECK (entity_id_a < entity_id_b),
  CONSTRAINT hygiene_candidates_distinct_ids CHECK (entity_id_a <> entity_id_b)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hygiene_candidates_pair
  ON hygiene_candidates (entity_type, entity_id_a, entity_id_b);

CREATE INDEX IF NOT EXISTS idx_hygiene_candidates_account_status
  ON hygiene_candidates (account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hygiene_candidates_patient
  ON hygiene_candidates (patient_id, status);

COMMENT ON TABLE hygiene_candidates IS 'Pares candidatos a duplicata; merge só após decisão do usuário.';
