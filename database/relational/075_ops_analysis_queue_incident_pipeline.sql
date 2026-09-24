-- Migration 075: status pipeline incidente (UI CH — 4 estados públicos)

ALTER TABLE ops_analysis_queue
  ADD COLUMN IF NOT EXISTS incident_pipeline_status VARCHAR(24) NOT NULL DEFAULT 'open'
    CHECK (incident_pipeline_status IN (
      'open', 'forwarded', 'queued_worker', 'in_triage', 'triaged', 'dismissed'
    ));

CREATE INDEX IF NOT EXISTS idx_ops_analysis_queue_incident_pipeline
  ON ops_analysis_queue (incident_pipeline_status, updated_at DESC)
  WHERE incident_pipeline_status NOT IN ('triaged', 'dismissed');

COMMENT ON COLUMN ops_analysis_queue.incident_pipeline_status IS
  'Pipeline CH incidente — UI: Aberto, Encaminhado, Em fila, Em triagem (+ triaged/dismissed internos).';
