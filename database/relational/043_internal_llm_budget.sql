-- Separação de custo LLM cliente vs interno + orçamento mensal interno (R$)
-- Backfill de custos internos de classificação de rótulos de operadora.

-- 1) Classifica cada evento como custo do CLIENTE (usado nos pacotes/entitlements)
--    ou custo INTERNO (operacional nosso: classificação de rótulos, jobs).
ALTER TABLE llm_usage_events
  ADD COLUMN IF NOT EXISTS cost_bucket VARCHAR(16)
  NOT NULL DEFAULT 'client'
  CHECK (cost_bucket IN ('client', 'internal'));

CREATE INDEX IF NOT EXISTS idx_llm_usage_events_bucket_feature
  ON llm_usage_events (cost_bucket, feature, created_at DESC);

-- 2) Orçamento mensal interno em CENTAVOS (default R$100/mês).
CREATE TABLE IF NOT EXISTS llm_internal_budget (
  scope_id VARCHAR(64) PRIMARY KEY,           -- global 'internal-operations'
  monthly_cost_cents BIGINT NOT NULL DEFAULT 0,
  monthly_period CHAR(7) NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
