-- Migration 084: reincidência INC→INC + status terminal resolved

ALTER TABLE ops_analysis_queue
  DROP CONSTRAINT IF EXISTS ops_analysis_queue_incident_pipeline_status_check;

ALTER TABLE ops_analysis_queue
  ADD CONSTRAINT ops_analysis_queue_incident_pipeline_status_check
  CHECK (incident_pipeline_status IN (
    'open', 'forwarded', 'queued_worker', 'in_triage', 'triaged', 'resolved', 'dismissed', 'dispatch_failed'
  ));

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

DROP INDEX IF EXISTS idx_ops_analysis_queue_active_source;
CREATE UNIQUE INDEX idx_ops_analysis_queue_active_source
  ON ops_analysis_queue (source_type, source_id, deployment_tier)
  WHERE incident_pipeline_status NOT IN ('resolved', 'dismissed');

DROP INDEX IF EXISTS idx_ops_analysis_queue_incident_pipeline;
CREATE INDEX idx_ops_analysis_queue_incident_pipeline
  ON ops_analysis_queue (incident_pipeline_status, updated_at DESC)
  WHERE incident_pipeline_status NOT IN ('triaged', 'resolved', 'dismissed');

-- Backfill: INC triado com DEF já fixed (piloto INC-000001 / DEF-000002)
UPDATE ops_analysis_queue q
SET
  incident_pipeline_status = 'resolved',
  status = 'completed',
  completed_at = COALESCE(q.completed_at, NOW()),
  updated_at = NOW()
FROM platform_defect_incidents pdi
JOIN platform_defects d ON d.id = pdi.defect_id
WHERE pdi.incident_id = q.id
  AND d.status = 'fixed'
  AND q.incident_pipeline_status = 'triaged';

COMMENT ON COLUMN ops_analysis_queue.incident_pipeline_status IS
  'Pipeline CH — UI: Aberto…Triado, Resolvido (DEF fixed), Falha (+ dismissed).';

COMMENT ON COLUMN ops_analysis_queue.recurrence_of_incident_id IS
  'INC anterior resolvido quando este registro é nova ocorrência — UX reincidência CH.';

COMMENT ON COLUMN ops_analysis_queue.recurrence_kind IS
  'Tipo do vínculo com recurrence_of_incident_id; hoje só reincidencia.';
