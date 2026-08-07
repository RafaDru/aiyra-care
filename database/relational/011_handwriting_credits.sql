-- Créditos para interpretação de manuscritos (LLM vision).
-- scope_id = tenant/conta (hoje 'default'; futuro: user/org id para SaaS).

CREATE TABLE IF NOT EXISTS handwriting_credit_accounts (
  scope_id VARCHAR(64) PRIMARY KEY,
  package_credits INT NOT NULL DEFAULT 0,
  monthly_free_allowance INT NOT NULL DEFAULT 10,
  monthly_free_used INT NOT NULL DEFAULT 0,
  monthly_period CHAR(7) NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO handwriting_credit_accounts (scope_id)
VALUES ('default')
ON CONFLICT (scope_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS handwriting_credit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_id VARCHAR(64) NOT NULL REFERENCES handwriting_credit_accounts(scope_id),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  event_type VARCHAR(32) NOT NULL,
  credits_delta INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handwriting_events_scope_created
  ON handwriting_credit_events (scope_id, created_at DESC);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS interpretation_json JSONB,
  ADD COLUMN IF NOT EXISTS interpreted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interpretation_provider VARCHAR(64);
