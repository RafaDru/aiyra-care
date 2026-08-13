-- Billing SaaS: entitlements por conta + histórico de compras Stripe

CREATE TABLE IF NOT EXISTS account_entitlements (
  account_id UUID PRIMARY KEY REFERENCES app_accounts(id) ON DELETE CASCADE,
  plan_tier VARCHAR(32) NOT NULL DEFAULT 'free'
    CHECK (plan_tier IN ('free', 'family')),
  monthly_free_allowance INT NOT NULL DEFAULT 10,
  stripe_customer_id VARCHAR(120),
  stripe_subscription_id VARCHAR(120),
  subscription_status VARCHAR(32),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(120),
  stripe_payment_intent_id VARCHAR(120),
  package_credits INT NOT NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'brl',
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_billing_purchases_account ON billing_purchases(account_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_purchases_session ON billing_purchases(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
