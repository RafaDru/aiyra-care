-- Telemetria de uso LLM por conta (Ava MVP) + saldo de tokens do mês

CREATE TABLE IF NOT EXISTS llm_usage_accounts (
  scope_id VARCHAR(64) PRIMARY KEY,
  monthly_tokens_used BIGINT NOT NULL DEFAULT 0,
  monthly_period CHAR(7) NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id VARCHAR(64) NOT NULL,
  account_id UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  feature VARCHAR(32) NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  conversation_id UUID,
  provider VARCHAR(64),
  model VARCHAR(80),
  tier VARCHAR(16) CHECK (tier IS NULL OR tier IN ('free', 'premium')),
  tokens_in INT NOT NULL DEFAULT 0,
  tokens_out INT NOT NULL DEFAULT 0,
  tokens_total INT NOT NULL DEFAULT 0,
  usage_source VARCHAR(16) NOT NULL DEFAULT 'estimated'
    CHECK (usage_source IN ('api', 'estimated')),
  estimated_cost_cents INT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_events_scope_created
  ON llm_usage_events (scope_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_usage_events_account_created
  ON llm_usage_events (account_id, created_at DESC)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_llm_usage_events_feature
  ON llm_usage_events (feature, created_at DESC);
