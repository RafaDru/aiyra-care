-- Migration 063: perfil compartilhado entre famílias (caso Mariana — blended patient)
-- docs/FAMILY_ACCESS_MODEL.md fase 3

ALTER TABLE patient_circle_links
  ADD COLUMN IF NOT EXISTS link_kind VARCHAR(16) NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS linked_by_account_id UUID REFERENCES app_accounts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_circle_links_kind_chk'
  ) THEN
    ALTER TABLE patient_circle_links
      ADD CONSTRAINT patient_circle_links_kind_chk
      CHECK (link_kind IN ('primary', 'shared'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS patient_profile_share_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  owner_account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  target_account_email VARCHAR(320) NOT NULL,
  target_circle_id UUID REFERENCES care_circles(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  token VARCHAR(64) NOT NULL UNIQUE,
  legitimacy_ack BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_account_id UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_share_invites_owner
  ON patient_profile_share_invites (owner_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_share_invites_email_pending
  ON patient_profile_share_invites (lower(target_account_email), status)
  WHERE status = 'pending';

COMMENT ON TABLE patient_profile_share_invites IS
  'Titular compartilha perfil de saúde com família de outra conta; aceite vincula patient_circle_links shared.';
