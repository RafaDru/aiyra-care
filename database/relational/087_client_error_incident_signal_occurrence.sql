-- Occurrence counter for CLIENT_ERROR_INCIDENT_MIN_COUNT (dedupe window on signals table).

ALTER TABLE client_error_incident_signals
  ADD COLUMN IF NOT EXISTS occurrence_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN client_error_incident_signals.occurrence_count IS
  'Hits in current dedupe window before auto INC enqueue (MIN_COUNT gate).';
