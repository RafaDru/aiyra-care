-- Migration 068: pilha unificada de investigação (Suporte Dev + SRE)

CREATE TABLE IF NOT EXISTS ops_analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(32) NOT NULL
    CHECK (source_type IN ('support_report', 'ops_alert')),
  source_id VARCHAR(128) NOT NULL,
  lane VARCHAR(32) NOT NULL
    CHECK (lane IN ('development_support', 'sre_support')),
  status VARCHAR(24) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'investigating', 'fix_proposed', 'completed', 'dismissed', 'failed')),
  priority VARCHAR(16) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  deployment_tier VARCHAR(24) NOT NULL DEFAULT 'integration'
    CHECK (deployment_tier IN ('integration', 'preview', 'production')),
  title VARCHAR(512) NOT NULL,
  error_summary TEXT,
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  remediation_summary TEXT,
  analysis_artifact_path VARCHAR(512),
  pr_url VARCHAR(512),
  analysis_last_error TEXT,
  operator_notes TEXT,
  investigation_trigger VARCHAR(16)
    CHECK (investigation_trigger IS NULL OR investigation_trigger IN ('auto', 'manual')),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  investigation_requested_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_type, source_id, deployment_tier)
);

CREATE INDEX IF NOT EXISTS idx_ops_analysis_queue_status_updated
  ON ops_analysis_queue (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_analysis_queue_lane_status
  ON ops_analysis_queue (lane, status, updated_at DESC);

COMMENT ON TABLE ops_analysis_queue IS
  'Pilha de investigação ops — lanes development_support (reporte app) e sre_support (alertas).';
