-- Círculos de cuidado B2C (Família A / B) — ver docs/FAMILY_ACCESS_MODEL.md

CREATE TABLE IF NOT EXISTS care_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  billing_owner_account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_circles_billing_owner
  ON care_circles (billing_owner_account_id);

CREATE TABLE IF NOT EXISTS care_circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES care_circles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT care_circle_members_unique UNIQUE (circle_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_care_circle_members_account
  ON care_circle_members (account_id);

CREATE TABLE IF NOT EXISTS patient_circle_links (
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES care_circles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (patient_id, circle_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_circle_links_circle
  ON patient_circle_links (circle_id);

COMMENT ON TABLE care_circles IS 'Agrupamento familiar B2C — billing_owner = titular da assinatura';

-- Backfill: um círculo padrão por titular de perfil
INSERT INTO care_circles (name, billing_owner_account_id)
SELECT 'Minha família', owner_account_id
FROM (
  SELECT DISTINCT owner_account_id
  FROM patients
  WHERE owner_account_id IS NOT NULL
) owners
WHERE NOT EXISTS (
  SELECT 1 FROM care_circles c WHERE c.billing_owner_account_id = owners.owner_account_id
);

INSERT INTO care_circle_members (circle_id, account_id, role)
SELECT c.id, c.billing_owner_account_id, 'owner'
FROM care_circles c
ON CONFLICT (circle_id, account_id) DO NOTHING;

INSERT INTO patient_circle_links (patient_id, circle_id)
SELECT p.id, c.id
FROM patients p
JOIN care_circles c ON c.billing_owner_account_id = p.owner_account_id
ON CONFLICT (patient_id, circle_id) DO NOTHING;
