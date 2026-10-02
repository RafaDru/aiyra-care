-- Dedupe window for auto client-error → CH incident bridge (per fingerprint × tier).

CREATE TABLE IF NOT EXISTS client_error_incident_signals (
  fingerprint VARCHAR(32) NOT NULL,
  deployment_tier VARCHAR(64) NOT NULL,
  last_incident_queue_id UUID,
  last_enqueued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fingerprint, deployment_tier)
);

CREATE INDEX IF NOT EXISTS idx_client_error_incident_signals_enqueued
  ON client_error_incident_signals (last_enqueued_at DESC);

COMMENT ON TABLE client_error_incident_signals IS
  'Dedupe auto INC from client_errors fingerprints — no PHI, tier-scoped window.';
