-- Migration 076: status UI «Falha» no CH (dispatch esgotado / webhook 40x)

ALTER TABLE ops_analysis_queue
  DROP CONSTRAINT IF EXISTS ops_analysis_queue_incident_pipeline_status_check;

ALTER TABLE ops_analysis_queue
  ADD CONSTRAINT ops_analysis_queue_incident_pipeline_status_check
  CHECK (incident_pipeline_status IN (
    'open', 'forwarded', 'queued_worker', 'in_triage', 'triaged', 'dismissed', 'dispatch_failed'
  ));

COMMENT ON COLUMN ops_analysis_queue.incident_pipeline_status IS
  'Pipeline CH — UI: Aberto, Encaminhado, Em fila, Em triagem, Falha (+ triaged/dismissed internos).';
