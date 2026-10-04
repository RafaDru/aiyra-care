-- Migration 084: reincidência INC→INC (novo INC após triado/fixed, sem status resolved)

ALTER TABLE ops_analysis_queue
  ADD COLUMN IF NOT EXISTS recurrence_of_incident_id UUID NULL
  REFERENCES ops_analysis_queue (id) ON DELETE SET NULL;

ALTER TABLE ops_analysis_queue
  ADD COLUMN IF NOT EXISTS recurrence_kind VARCHAR(24) NULL
  CHECK (recurrence_kind IS NULL OR recurrence_kind IN ('reincidencia'));

CREATE INDEX IF NOT EXISTS idx_ops_analysis_queue_recurrence_of
  ON ops_analysis_queue (recurrence_of_incident_id)
  WHERE recurrence_of_incident_id IS NOT NULL;

ALTER TABLE ops_analysis_queue
  DROP CONSTRAINT IF EXISTS ops_analysis_queue_source_type_source_id_deployment_tier_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_analysis_queue_active_source
  ON ops_analysis_queue (source_type, source_id, deployment_tier)
  WHERE incident_pipeline_status NOT IN ('triaged', 'dismissed');

COMMENT ON COLUMN ops_analysis_queue.recurrence_of_incident_id IS
  'INC anterior (tipicamente triado) quando este registro é nova ocorrência — UX reincidência CH.';

COMMENT ON COLUMN ops_analysis_queue.recurrence_kind IS
  'Tipo do vínculo com recurrence_of_incident_id; hoje só reincidencia.';
