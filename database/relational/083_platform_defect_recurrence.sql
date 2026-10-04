-- Migration 083: reincidência pós-fixed (parent_defect_id)

ALTER TABLE platform_defects
  ADD COLUMN IF NOT EXISTS parent_defect_id UUID NULL
  REFERENCES platform_defects (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_platform_defects_parent_defect
  ON platform_defects (parent_defect_id)
  WHERE parent_defect_id IS NOT NULL;

COMMENT ON COLUMN platform_defects.parent_defect_id IS
  'DEF anterior (status fixed) quando novo INC reabre a mesma fingerprint após fixed_at — CH_DEFECT_PIPELINE_DECISIONS §3.';
