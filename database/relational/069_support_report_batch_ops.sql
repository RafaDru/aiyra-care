-- Migration 069: batch investigator + taxonomia + ciclo implantar (support_reports)
-- docs/ops/SUPPORT_REPORTS.md · spec batch 6h

ALTER TABLE support_reports
  DROP CONSTRAINT IF EXISTS support_reports_analysis_status_check;

ALTER TABLE support_reports
  ADD COLUMN IF NOT EXISTS suggested_category VARCHAR(32),
  ADD COLUMN IF NOT EXISTS category_review_note TEXT,
  ADD COLUMN IF NOT EXISTS taxonomy_gap_proposal TEXT,
  ADD COLUMN IF NOT EXISTS deployment_status VARCHAR(32) NOT NULL DEFAULT 'none'
    CHECK (deployment_status IN (
      'none', 'fix_proposed', 'awaiting_merge', 'awaiting_deploy', 'awaiting_validation', 'done'
    )),
  ADD COLUMN IF NOT EXISTS deployment_actions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE support_reports
  ADD CONSTRAINT support_reports_analysis_status_check
    CHECK (analysis_status IN ('none', 'queued', 'pending', 'in_progress', 'completed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_support_reports_batch_queued
  ON support_reports (category, created_at DESC)
  WHERE status IN ('open', 'triaged') AND analysis_status = 'queued';

COMMENT ON COLUMN support_reports.suggested_category IS 'Categoria sugerida pelo agente investigador (revisão taxonomia)';
COMMENT ON COLUMN support_reports.deployment_status IS 'Ciclo implantar fix: none → fix_proposed → awaiting_* → done';
COMMENT ON COLUMN support_reports.deployment_actions IS 'Checklist ops [{ label, kind, url?, done? }]';
