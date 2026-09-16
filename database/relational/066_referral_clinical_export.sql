-- D4: código de indicação na conta + metadados no share clínico

ALTER TABLE app_accounts
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_accounts_referral_code
  ON app_accounts(referral_code)
  WHERE referral_code IS NOT NULL;

ALTER TABLE clinical_export_shares
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12),
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clinical_export_shares_referral
  ON clinical_export_shares(referral_code)
  WHERE referral_code IS NOT NULL;
