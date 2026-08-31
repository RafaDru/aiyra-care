-- Migration 050: cache freshness (generation stamps per account/patient domain)
-- docs/OPERATION_MODEL.md §7

CREATE TABLE IF NOT EXISTS data_domain_generations (
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  patient_id UUID NULL REFERENCES patients(id) ON DELETE CASCADE,
  domain VARCHAR(48) NOT NULL,
  generation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT data_domain_generations_scope_chk CHECK (
    domain <> ''
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_data_domain_gen_account
  ON data_domain_generations (account_id, domain)
  WHERE patient_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_data_domain_gen_patient
  ON data_domain_generations (account_id, patient_id, domain)
  WHERE patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_data_domain_gen_account_lookup
  ON data_domain_generations (account_id);

COMMENT ON TABLE data_domain_generations IS
  'Monotonic generation stamp per scope; bump on write invalidates client/BFF cache.';
