-- B2B primitives — organizações e membros (piloto futuro)

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'other'
    CHECK (kind IN ('clinic', 'lab', 'pharmacy', 'plan', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'clinician', 'read_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_account ON organization_members(account_id);
