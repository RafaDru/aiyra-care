-- Migration 061: relatórios de problema do usuário (LGPD — consentimento granular)
-- docs/features/support-user-reports.md

CREATE TABLE IF NOT EXISTS support_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'triaged', 'resolved', 'closed')),
  category VARCHAR(32) NOT NULL
    CHECK (category IN ('technical_bug', 'incorrect_data', 'ux_confusion', 'other')),
  description TEXT,
  route VARCHAR(256),
  session_id VARCHAR(64),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  consent_technical BOOLEAN NOT NULL DEFAULT false,
  consent_screenshot BOOLEAN NOT NULL DEFAULT false,
  consent_profile_access BOOLEAN NOT NULL DEFAULT false,
  profile_access_until TIMESTAMPTZ,
  diagnostic_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  screenshot_data TEXT,
  app_version VARCHAR(64),
  user_agent VARCHAR(256),
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_reports_account_created
  ON support_reports (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_reports_status_open
  ON support_reports (status, created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_support_reports_expires
  ON support_reports (expires_at)
  WHERE status <> 'closed';

COMMENT ON TABLE support_reports IS
  'Chamados de suporte iniciados pelo usuário; bundle diagnóstico sem PHI por default; TTL em expires_at.';
