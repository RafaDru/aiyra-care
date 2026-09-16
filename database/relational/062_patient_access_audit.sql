-- Migration 062: trilha de auditoria ACL familiar (LGPD accountability)
-- docs/features/family-access-model.md · family-access-audit-log

CREATE TABLE IF NOT EXISTS patient_access_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  actor_account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE SET NULL,
  target_account_id UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  action VARCHAR(48) NOT NULL,
  access_level VARCHAR(24),
  membership_role VARCHAR(24),
  care_circle_id UUID REFERENCES care_circles(id) ON DELETE SET NULL,
  invite_id UUID,
  grant_id UUID,
  patient_count INT,
  request_ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT patient_access_audit_action_chk CHECK (
    action IN (
      'grant_created',
      'grant_revoked',
      'invite_sent',
      'invite_accepted',
      'invite_revoked'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_patient_access_audit_patient_created
  ON patient_access_audit_events (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_access_audit_actor_created
  ON patient_access_audit_events (actor_account_id, created_at DESC);

COMMENT ON TABLE patient_access_audit_events IS
  'Auditoria de grants/convites família — sem e-mail nem PHI; IDs de conta apenas.';
