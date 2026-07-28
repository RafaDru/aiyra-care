ALTER TABLE vaccines ADD COLUMN source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE exams ADD COLUMN source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE medical_records ADD COLUMN source VARCHAR(50) DEFAULT 'manual';

CREATE TABLE integration_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  portal_type VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  encrypted_password TEXT,
  card_number VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, portal_type)
);
