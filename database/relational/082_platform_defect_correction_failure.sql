-- R1: structured correction_failed — metadata when Correção Dev callback declares failure.

ALTER TABLE platform_defects
  ADD COLUMN IF NOT EXISTS last_failure_kind TEXT,
  ADD COLUMN IF NOT EXISTS last_failure_summary TEXT,
  ADD COLUMN IF NOT EXISTS last_correction_failure_details JSONB,
  ADD COLUMN IF NOT EXISTS correction_failed_at TIMESTAMPTZ;

COMMENT ON COLUMN platform_defects.last_failure_kind IS
  'Kind of last pipeline failure: dispatch | callback | ci | review | human_reject (CH solo journey).';
COMMENT ON COLUMN platform_defects.last_failure_summary IS
  'Short human-readable summary of last_failure (callback correction_failed, CI, etc.).';
COMMENT ON COLUMN platform_defects.last_correction_failure_details IS
  'Structured failureDetails from Correção Dev callback (correction_failed).';
COMMENT ON COLUMN platform_defects.correction_failed_at IS
  'When the defect last returned to open via correction_failed callback.';
