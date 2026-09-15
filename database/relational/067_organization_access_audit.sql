-- B2B RBAC: trilha de auditoria de acesso à organização (LGPD)

CREATE TABLE IF NOT EXISTS organization_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  target_account_id UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_access_audit_org_created
  ON organization_access_audit(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_access_audit_actor
  ON organization_access_audit(actor_account_id, created_at DESC);
