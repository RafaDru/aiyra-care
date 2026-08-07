ALTER TABLE integration_links
  ADD COLUMN IF NOT EXISTS encrypted_session_token TEXT,
  ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;
