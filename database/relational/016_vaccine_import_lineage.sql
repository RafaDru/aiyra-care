-- Linha de importação: raw preservado + referência ao registro normalizado

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,
  portal VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  stats JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_patient ON import_batches(patient_id);

CREATE TABLE IF NOT EXISTS import_raw_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,
  record_type VARCHAR(50) NOT NULL,
  external_key VARCHAR(200),
  raw_json JSONB NOT NULL,
  catalog_slot_key VARCHAR(80),
  match_method VARCHAR(30),
  match_score NUMERIC(5, 4),
  processed_table VARCHAR(50),
  processed_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_raw_patient ON import_raw_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_import_raw_batch ON import_raw_records(batch_id);

ALTER TABLE vaccine_schedule_items
  ADD COLUMN IF NOT EXISTS catalog_slot_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS match_method VARCHAR(30),
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS import_raw_id UUID REFERENCES import_raw_records(id);

ALTER TABLE vaccines
  ADD COLUMN IF NOT EXISTS vaccine_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS external_key VARCHAR(200),
  ADD COLUMN IF NOT EXISTS catalog_slot_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS import_raw_id UUID REFERENCES import_raw_records(id);
