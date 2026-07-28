-- Link authorizations to originating consultation + enrich medical_records with Extrato fields

ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS charged_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS copart_company_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS copart_base_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS provider_external_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS procedure_external_id VARCHAR(50);

ALTER TABLE authorizations
  ADD COLUMN IF NOT EXISTS medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_external_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_authorizations_medical_record_id
  ON authorizations (medical_record_id);

CREATE INDEX IF NOT EXISTS idx_medical_records_provider_date
  ON medical_records (patient_id, provider_external_id, record_date);
