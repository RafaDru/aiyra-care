-- Lembretes e consultas programadas pelo usuário (hub Agenda)

CREATE TABLE IF NOT EXISTS scheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  health_thread_id UUID REFERENCES health_threads(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  kind VARCHAR(30) NOT NULL DEFAULT 'reminder'
    CHECK (kind IN ('appointment', 'reminder', 'task')),
  status VARCHAR(30) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'done', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_events_patient ON scheduled_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_scheduled_at ON scheduled_events(patient_id, scheduled_at);
