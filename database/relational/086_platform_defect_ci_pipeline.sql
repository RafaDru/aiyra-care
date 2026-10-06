-- Migration 086: defeito — pipeline CI/GitHub (fatia C2 / ch-cycle-close)
-- Spec: docs/ops/CH_CYCLE_CLOSE_SPEC.md §4

ALTER TABLE platform_defects
  ADD COLUMN IF NOT EXISTS pipeline_status VARCHAR(32) NULL
    CHECK (pipeline_status IS NULL OR pipeline_status IN (
      'ci_pending',
      'ci_running',
      'ci_failed',
      'ci_success',
      'review_pending',
      'review_failed',
      'approved_for_merge'
    )),
  ADD COLUMN IF NOT EXISTS last_failure_details JSONB NULL,
  ADD COLUMN IF NOT EXISTS last_ci_run_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_ci_snapshot JSONB NULL,
  ADD COLUMN IF NOT EXISTS last_ci_checked_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN platform_defects.pipeline_status IS
  'Esteira pós-ready_for_pr: CI + review; ver CH_CYCLE_CLOSE_SPEC §5.';
COMMENT ON COLUMN platform_defects.last_failure_details IS
  'JSON: actionsRunId, failedJobs[], logExcerpt, reviewId, etc.';
COMMENT ON COLUMN platform_defects.last_ci_run_url IS
  'URL da última GitHub Actions run associada ao defeito (R2).';
COMMENT ON COLUMN platform_defects.last_ci_snapshot IS
  'Snapshot JSON do último estado de CI (checks, jobs, conclusão).';
COMMENT ON COLUMN platform_defects.last_ci_checked_at IS
  'Quando o CH atualizou last_ci_* (webhook ou polling).';

CREATE INDEX IF NOT EXISTS idx_platform_defects_pipeline_open
  ON platform_defects (pipeline_status, updated_at DESC)
  WHERE status IN ('in_fix', 'ready_for_pr');
