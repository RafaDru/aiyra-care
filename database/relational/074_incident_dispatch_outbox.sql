-- Migration 074: outbox dispatch incidente → triagem (idempotente)

CREATE TABLE IF NOT EXISTS incident_dispatch_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES ops_analysis_queue(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'forwarded', 'claimed', 'failed', 'dead')),
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  forwarded_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_incident_dispatch_outbox_pending
  ON incident_dispatch_outbox (status, created_at)
  WHERE status IN ('pending', 'forwarded');

COMMENT ON TABLE incident_dispatch_outbox IS
  'Outbox PG para webhook investigador — idempotency_key = incident_id:dispatch_kind.';
