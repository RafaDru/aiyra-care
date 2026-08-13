-- Conexão OAuth Google Calendar por conta + paciente

CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL DEFAULT 'google'
    CHECK (provider IN ('google')),
  calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
  calendar_label VARCHAR(500),
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, patient_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_patient ON calendar_connections(patient_id);
