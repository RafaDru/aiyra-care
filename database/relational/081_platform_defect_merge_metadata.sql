-- Migration 081: merge GitHub → fixed (fatia R4)

ALTER TABLE platform_defects
  ADD COLUMN IF NOT EXISTS merged_pr_url VARCHAR(512) NULL,
  ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS fixed_via VARCHAR(32) NULL
    CHECK (fixed_via IS NULL OR fixed_via IN ('github_webhook', 'manual'));

COMMENT ON COLUMN platform_defects.merged_pr_url IS
  'URL do PR mergeado em main (webhook pull_request ou confirmação manual).';
COMMENT ON COLUMN platform_defects.merged_at IS
  'Timestamp do merge confirmado (GitHub webhook ou operador).';
COMMENT ON COLUMN platform_defects.fixed_via IS
  'Origem do fechamento: github_webhook | manual.';

CREATE INDEX IF NOT EXISTS idx_platform_defects_pr_url_active
  ON platform_defects (lower(regexp_replace(trim(pr_url), '/+$', '')))
  WHERE pr_url IS NOT NULL AND status IN ('in_fix', 'ready_for_pr');
