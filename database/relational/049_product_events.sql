-- Eventos de produto sem PHI (épico observability-platform)

CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  event_name VARCHAR(64) NOT NULL,
  route VARCHAR(128),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_account_created
  ON product_events (account_id, created_at DESC)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_name_created
  ON product_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_created
  ON product_events (created_at DESC);
