-- Calendário vacinal (previstas + aplicadas) e marcos de desenvolvimento importados da Caderneta da Criança / RNDS

CREATE TABLE IF NOT EXISTS vaccine_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  vaccine_code VARCHAR(50),
  vaccine_name VARCHAR(255) NOT NULL,
  dose_label VARCHAR(100),
  dose_number INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expected_age_months INTEGER,
  expected_date DATE,
  application_date DATE,
  next_dose_date DATE,
  batch_number VARCHAR(100),
  applied_by VARCHAR(255),
  clinic VARCHAR(255),
  notes TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'caderneta',
  external_key VARCHAR(200),
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccine_schedule_patient ON vaccine_schedule_items(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vaccine_schedule_dedup
  ON vaccine_schedule_items(patient_id, source, external_key)
  WHERE external_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS development_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'unknown',
  expected_age_months INTEGER,
  achieved_date DATE,
  notes TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'caderneta',
  external_key VARCHAR(200),
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_milestones_patient ON development_milestones(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_milestones_dedup
  ON development_milestones(patient_id, source, external_key)
  WHERE external_key IS NOT NULL;
