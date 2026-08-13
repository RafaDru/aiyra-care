-- Links temporários para compartilhar export clínico com médicos

CREATE TABLE IF NOT EXISTS clinical_export_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('summary', 'full')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_export_shares_patient ON clinical_export_shares(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_export_shares_expires ON clinical_export_shares(expires_at);
