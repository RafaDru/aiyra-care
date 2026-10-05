-- Migration 085: Agent 3 — revisão agêntica de PR (CH R3)

CREATE TABLE IF NOT EXISTS defect_pr_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES platform_defects (id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  trigger VARCHAR(16) NOT NULL DEFAULT 'manual'
    CHECK (trigger IN ('manual', 'auto_ready', 'batch')),
  pr_url TEXT NOT NULL,
  branch_name TEXT NULL,
  head_sha TEXT NULL,
  investigation_id UUID NULL,
  dimensions JSONB NULL,
  recommendation VARCHAR(32) NULL
    CHECK (recommendation IS NULL OR recommendation IN ('approve', 'request_changes', 'block')),
  recommendation_rationale TEXT NULL,
  ci_snapshot JSONB NULL,
  pr_review_comment_url TEXT NULL,
  agent_run_url TEXT NULL,
  failure_details JSONB NULL,
  raw_json JSONB NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defect_pr_reviews_defect_completed
  ON defect_pr_reviews (defect_id, completed_at DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_defect_pr_reviews_defect_running
  ON defect_pr_reviews (defect_id)
  WHERE status IN ('pending', 'running');

ALTER TABLE platform_defects
  ADD COLUMN IF NOT EXISTS last_pr_review_id UUID NULL,
  ADD COLUMN IF NOT EXISTS last_pr_review_recommendation VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS last_pr_review_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS operator_pr_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS operator_pr_approved_note TEXT NULL,
  ADD COLUMN IF NOT EXISTS operator_changes_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS operator_changes_requested_note TEXT NULL;

COMMENT ON TABLE defect_pr_reviews IS 'Revisões agênticas (Agent 3) para PRs de platform_defects.';
COMMENT ON COLUMN platform_defects.last_pr_review_id IS 'Última revisão agêntica (join defect_pr_reviews).';
