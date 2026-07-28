-- Enrich authorizations with Unimed BH detail-page fields + child procedure items

ALTER TABLE authorizations
  ADD COLUMN IF NOT EXISTS solicitation_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guide_password VARCHAR(100),
  ADD COLUMN IF NOT EXISTS specialty VARCHAR(255),
  ADD COLUMN IF NOT EXISTS solicitation_url TEXT,
  ADD COLUMN IF NOT EXISTS solic_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS solic_id_encrypted VARCHAR(100),
  ADD COLUMN IF NOT EXISTS authorization_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS classification VARCHAR(255),
  ADD COLUMN IF NOT EXISTS local_address TEXT,
  ADD COLUMN IF NOT EXISTS local_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS locations JSONB,
  ADD COLUMN IF NOT EXISTS history JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_authorizations_patient_solicitation
  ON authorizations (patient_id, solicitation_number)
  WHERE solicitation_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_authorizations_solic_id
  ON authorizations (solic_id)
  WHERE solic_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS authorization_items (
  id UUID PRIMARY KEY,
  authorization_id UUID NOT NULL REFERENCES authorizations(id) ON DELETE CASCADE,
  procedure_code VARCHAR(50),
  procedure_description VARCHAR(500) NOT NULL,
  quantity_requested INTEGER,
  quantity_authorized INTEGER,
  status VARCHAR(50),
  external_procedure_id VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authorization_items_authorization_id
  ON authorization_items (authorization_id);
