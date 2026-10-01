-- Migration 073: lotes PR no CH (somente defeitos ready_for_pr)

CREATE TABLE IF NOT EXISTS defect_pr_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(24) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'merged', 'failed')),
  scheduled_window_start TIMESTAMPTZ NOT NULL,
  merged_pr_url VARCHAR(512) NULL,
  defect_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defect_pr_batches_status_created
  ON defect_pr_batches (status, created_at DESC);

ALTER TABLE platform_defects
  DROP CONSTRAINT IF EXISTS platform_defects_pr_batch_id_fkey;

ALTER TABLE platform_defects
  ADD CONSTRAINT platform_defects_pr_batch_id_fkey
  FOREIGN KEY (pr_batch_id) REFERENCES defect_pr_batches(id) ON DELETE SET NULL;

COMMENT ON TABLE defect_pr_batches IS
  'Lote agrupado no CH — elegibilidade: platform_defects.ready_for_pr sem pr_batch_id.';
