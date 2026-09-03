-- Convites de acesso familiar (MVP sem care_circles) — ver docs/FAMILY_ACCESS_MODEL.md

CREATE TABLE IF NOT EXISTS patient_access_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255) NOT NULL,
  patient_ids UUID[] NOT NULL CHECK (cardinality(patient_ids) > 0),
  access_level VARCHAR(16) NOT NULL DEFAULT 'full'
    CHECK (access_level IN ('full', 'read_only')),
  membership_role VARCHAR(30) NOT NULL DEFAULT 'guardian'
    CHECK (membership_role IN ('guardian', 'caregiver')),
  token VARCHAR(64) NOT NULL UNIQUE,
  legitimacy_ack BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_account_id UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_access_invites_inviter
  ON patient_access_invites (inviter_account_id);

CREATE INDEX IF NOT EXISTS idx_patient_access_invites_token
  ON patient_access_invites (token);

CREATE INDEX IF NOT EXISTS idx_patient_access_invites_pending_email
  ON patient_access_invites (lower(invitee_email))
  WHERE status = 'pending';

COMMENT ON TABLE patient_access_invites IS 'Convites B2C — co-cuidador com escopo de perfis de saúde';
