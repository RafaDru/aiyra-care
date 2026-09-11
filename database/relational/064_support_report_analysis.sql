-- Migration 064: ciclo de análise ops (investigador Cursor + notas do operador)
-- docs/features/support-user-reports.md

ALTER TABLE support_reports
  ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(24) NOT NULL DEFAULT 'none'
    CHECK (analysis_status IN ('none', 'pending', 'in_progress', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS operator_notes TEXT,
  ADD COLUMN IF NOT EXISTS analysis_summary TEXT,
  ADD COLUMN IF NOT EXISTS analysis_artifact_path VARCHAR(512),
  ADD COLUMN IF NOT EXISTS analysis_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_support_reports_analysis_open
  ON support_reports (analysis_status, created_at DESC)
  WHERE status IN ('open', 'triaged') AND analysis_status <> 'completed';

COMMENT ON COLUMN support_reports.analysis_status IS
  'Investigação ops: none=sem webhook, pending=retry manual, in_progress=agente disparado, completed=conclusão, failed=último dispatch falhou';
