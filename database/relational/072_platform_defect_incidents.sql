-- Migration 072: vínculo N incidentes (ops_analysis_queue) ↔ 1 defeito

CREATE TABLE IF NOT EXISTS platform_defect_incidents (
  defect_id UUID NOT NULL REFERENCES platform_defects(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES ops_analysis_queue(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_by VARCHAR(64) NOT NULL,
  PRIMARY KEY (defect_id, incident_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_defect_incidents_incident
  ON platform_defect_incidents (incident_id);

COMMENT ON TABLE platform_defect_incidents IS
  'Associação incidente (fila ops) com defeito — linked_by: agent_triage, ops_manual, system_dedup.';
