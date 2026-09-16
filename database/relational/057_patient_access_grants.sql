-- ACL explícito conta ↔ perfil de saúde (família B2C)
-- Fonte de verdade para listAccessiblePatientIds após backfill.

CREATE TABLE IF NOT EXISTS patient_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  access_level VARCHAR(16) NOT NULL DEFAULT 'full'
    CHECK (access_level IN ('full', 'read_only')),
  membership_role VARCHAR(30) NOT NULL DEFAULT 'guardian'
    CHECK (membership_role IN ('self', 'guardian', 'caregiver')),
  granted_by UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT patient_access_grants_patient_account_unique UNIQUE (patient_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_access_grants_account
  ON patient_access_grants (account_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_patient_access_grants_patient
  ON patient_access_grants (patient_id)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE patient_access_grants IS 'ACL B2C — quem vê cada perfil de saúde; ver docs/FAMILY_ACCESS_MODEL.md';

-- Backfill a partir de memberships existentes
INSERT INTO patient_access_grants (patient_id, account_id, membership_role, access_level, granted_by)
SELECT pm.patient_id, pm.account_id, pm.role, 'full', pm.account_id
FROM patient_memberships pm
ON CONFLICT (patient_id, account_id) DO NOTHING;

-- Titulares owner_account_id sem membership explícita
INSERT INTO patient_access_grants (patient_id, account_id, membership_role, access_level, granted_by)
SELECT p.id, p.owner_account_id, 'guardian', 'full', p.owner_account_id
FROM patients p
WHERE p.owner_account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM patient_access_grants g
    WHERE g.patient_id = p.id AND g.account_id = p.owner_account_id AND g.revoked_at IS NULL
  );
