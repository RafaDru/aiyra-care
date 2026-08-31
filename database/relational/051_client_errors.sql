-- Migration 051: client error catalog (fingerprint 3D — user × feature × error)
-- docs/OPERATION_MODEL.md Fase 3

CREATE TABLE IF NOT EXISTS client_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NULL REFERENCES app_accounts(id) ON DELETE SET NULL,
  session_id VARCHAR(64) NULL,
  fingerprint VARCHAR(32) NOT NULL,
  feature VARCHAR(64) NOT NULL,
  error_kind VARCHAR(24) NOT NULL,
  error_code VARCHAR(64) NOT NULL DEFAULT 'unknown',
  route VARCHAR(256) NULL,
  patient_id UUID NULL REFERENCES patients(id) ON DELETE SET NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_errors_kind_chk CHECK (
    error_kind IN ('ui_boundary', 'api', 'network')
  )
);

CREATE INDEX IF NOT EXISTS idx_client_errors_fingerprint_created
  ON client_errors (fingerprint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_errors_feature_created
  ON client_errors (feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_errors_account_created
  ON client_errors (account_id, created_at DESC)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_errors_created
  ON client_errors (created_at DESC);

COMMENT ON TABLE client_errors IS
  'Sanitized client-side errors for ops catalog; no stack traces or PHI.';
