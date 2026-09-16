-- Sessão gov.br persistida (ConecteSUS / Caderneta) + atenção de credenciais em vínculos

CREATE TABLE IF NOT EXISTS govbr_sessions (
  account_id UUID PRIMARY KEY REFERENCES app_accounts(id) ON DELETE CASCADE,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  conectesus_last_fetch_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE integration_links
  ADD COLUMN IF NOT EXISTS auth_attention TEXT NOT NULL DEFAULT 'none'
    CHECK (auth_attention IN ('none', 'credentials', 'session'));

ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS failure_kind TEXT
    CHECK (
      failure_kind IS NULL OR failure_kind IN (
        'credentials_invalid',
        'session_expired',
        'interactive_required',
        'portal_blocked',
        'timeout',
        'unknown'
      )
    );
