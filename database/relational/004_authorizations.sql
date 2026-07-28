CREATE TABLE IF NOT EXISTS authorizations (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_code VARCHAR(50),
  procedure_description VARCHAR(500),
  doctor_name VARCHAR(255),
  doctor_council VARCHAR(100),
  clinic_name VARCHAR(255),
  authorization_date DATE,
  validity_date DATE,
  status VARCHAR(50) DEFAULT 'authorized',
  guide_number VARCHAR(100),
  quantity INTEGER,
  notes TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authorizations_patient_id ON authorizations(patient_id);
CREATE INDEX idx_authorizations_status ON authorizations(status);
