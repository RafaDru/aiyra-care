-- Migration 065: ciclo de análise ops para alertas (investigador Cursor + notas)
-- Fase B — persiste estado entre restarts do ops-console (substitui memória Fase A)

CREATE TABLE IF NOT EXISTS ops_alert_incidents (
  alert_id VARCHAR(128) PRIMARY KEY,
  analysis_status VARCHAR(24) NOT NULL DEFAULT 'none'
    CHECK (analysis_status IN ('none', 'pending', 'in_progress', 'completed', 'failed')),
  operator_notes TEXT,
  analysis_summary TEXT,
  analysis_artifact_path VARCHAR(512),
  analysis_requested_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,
  analysis_last_error TEXT,
  investigator_last_sent_at TIMESTAMPTZ,
  last_severity VARCHAR(16),
  last_category VARCHAR(32),
  last_message VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_alert_incidents_analysis_open
  ON ops_alert_incidents (analysis_status, updated_at DESC)
  WHERE analysis_status IN ('pending', 'in_progress', 'failed');

COMMENT ON TABLE ops_alert_incidents IS
  'Estado de investigação ops por alertId estável (infra_*, sync_*, llm_*). Tier 0 — sem PHI.';
