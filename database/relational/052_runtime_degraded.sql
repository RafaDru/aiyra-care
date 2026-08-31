-- Migration 052: runtime degraded state + D-1 read snapshots
-- docs/OPERATION_MODEL.md Fase 4

CREATE TABLE IF NOT EXISTS runtime_degraded_state (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS degraded_read_snapshots (
  patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  as_of DATE NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_degraded_read_snapshots_as_of
  ON degraded_read_snapshots (as_of DESC);

COMMENT ON TABLE runtime_degraded_state IS
  'Ops-driven degraded flags (sync portal pause, Ava lite, degraded_read).';
COMMENT ON TABLE degraded_read_snapshots IS
  'Nightly L3 snapshot for wallet/timeline when PG stressed.';
