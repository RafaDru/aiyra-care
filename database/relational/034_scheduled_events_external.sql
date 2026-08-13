-- Agenda fase 2: origem externa (ICS import / futuro OAuth Google/Microsoft)

ALTER TABLE scheduled_events
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'local'
    CHECK (source IN ('local', 'ics_import', 'google', 'microsoft'));

ALTER TABLE scheduled_events
  ADD COLUMN IF NOT EXISTS external_uid VARCHAR(500);

ALTER TABLE scheduled_events
  ADD COLUMN IF NOT EXISTS source_label VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_events_patient_external_uid
  ON scheduled_events(patient_id, external_uid)
  WHERE external_uid IS NOT NULL;

COMMENT ON COLUMN scheduled_events.source IS 'local | ics_import | google | microsoft';
COMMENT ON COLUMN scheduled_events.external_uid IS 'UID do VEVENT ou id do provedor — dedup na importação';
