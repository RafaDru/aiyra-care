-- Lembretes de monitoramento (medidas e medicação) vinculados ao episódio / acompanhamento

CREATE TABLE IF NOT EXISTS care_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  health_thread_id UUID REFERENCES health_threads(id) ON DELETE SET NULL,
  reminder_kind VARCHAR(32) NOT NULL
    CHECK (reminder_kind IN ('measurement', 'medication')),
  target_code VARCHAR(64),
  medication_name VARCHAR(500),
  title VARCHAR(500) NOT NULL,
  interval_minutes INT NOT NULL DEFAULT 240 CHECK (interval_minutes >= 15),
  next_fire_at TIMESTAMPTZ NOT NULL,
  last_completed_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  dose_hint VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_reminders_patient_fire
  ON care_reminders(patient_id, next_fire_at) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_care_reminders_thread
  ON care_reminders(health_thread_id) WHERE health_thread_id IS NOT NULL;
