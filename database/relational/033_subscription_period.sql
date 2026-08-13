-- Campos de assinatura Stripe para UI (renovação, cancelamento ao fim do período)

ALTER TABLE account_entitlements
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN account_entitlements.subscription_current_period_end IS 'Fim do período vigente (Stripe current_period_end).';
COMMENT ON COLUMN account_entitlements.subscription_cancel_at_period_end IS 'Stripe cancel_at_period_end — plano família até a data acima.';
