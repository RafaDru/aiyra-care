-- Migration 071: defeitos de plataforma (pós-triagem CH)

CREATE TABLE IF NOT EXISTS platform_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_fix', 'ready_for_pr', 'fixed')),
  fingerprint VARCHAR(128) NULL,
  impact SMALLINT NULL CHECK (impact IS NULL OR impact BETWEEN 1 AND 5),
  applications JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_subject VARCHAR(128) NULL,
  triage_summary TEXT NULL,
  triage_artifact_path VARCHAR(512) NULL,
  branch_name VARCHAR(256) NULL,
  pr_url VARCHAR(512) NULL,
  pr_batch_id UUID NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fix_started_at TIMESTAMPTZ NULL,
  ready_for_pr_at TIMESTAMPTZ NULL,
  fixed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_defects_status_updated
  ON platform_defects (status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_defects_fingerprint_open
  ON platform_defects (fingerprint)
  WHERE status IN ('open', 'in_fix', 'ready_for_pr') AND fingerprint IS NOT NULL;

COMMENT ON TABLE platform_defects IS
  'Defeitos de produto/infra após triagem — dedup por fingerprint, lote PR via defect_pr_batches.';
