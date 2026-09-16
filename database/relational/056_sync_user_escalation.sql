-- Migration 056: opt-in proativo família em sync crítico persistente (sem PHI)
-- docs/OPERATION_MODEL.md Fase 5 · run-user-escalation

CREATE TABLE IF NOT EXISTS account_notification_preferences (
  account_id UUID PRIMARY KEY REFERENCES app_accounts(id) ON DELETE CASCADE,
  sync_escalation_email BOOLEAN NOT NULL DEFAULT false,
  sync_escalation_opted_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_escalation_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  integration_link_id UUID NOT NULL REFERENCES integration_links(id) ON DELETE CASCADE,
  portal_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  failure_count INT NOT NULL DEFAULT 1,
  last_notified_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_escalation_open_link
  ON sync_escalation_incidents (integration_link_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_sync_escalation_account_open
  ON sync_escalation_incidents (account_id)
  WHERE status = 'open';

COMMENT ON TABLE account_notification_preferences IS
  'Opt-in LGPD para avisos proativos (sem PHI em canal externo).';
COMMENT ON TABLE sync_escalation_incidents IS
  'Incidentes open/resolved por integration_link; notificação genérica à família.';
