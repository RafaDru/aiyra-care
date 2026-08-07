-- Synced from database/relational/018_app_accounts.sql

CREATE TABLE IF NOT EXISTS app_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider VARCHAR(50) NOT NULL DEFAULT 'supabase',
  auth_subject UUID NOT NULL,
  email VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auth_provider, auth_subject)
);

CREATE INDEX IF NOT EXISTS idx_app_accounts_email ON app_accounts(email);

CREATE TABLE IF NOT EXISTS patient_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'guardian',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_memberships_account ON patient_memberships(account_id);
CREATE INDEX IF NOT EXISTS idx_patient_memberships_patient ON patient_memberships(patient_id);

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS owner_account_id UUID REFERENCES app_accounts(id);
