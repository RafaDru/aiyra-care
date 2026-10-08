-- Onboarding wizard v2 phase 2: nome social + endereço completo na conta

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS social_name VARCHAR(255);

COMMENT ON COLUMN patients.social_name IS 'Nome social (exibição preferida; LGPD art. 11 contexto saúde).';

ALTER TABLE account_profiles
  ADD COLUMN IF NOT EXISTS postal_code CHAR(8),
  ADD COLUMN IF NOT EXISTS street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS street_number VARCHAR(32),
  ADD COLUMN IF NOT EXISTS address_complement VARCHAR(120),
  ADD COLUMN IF NOT EXISTS district VARCHAR(120);

COMMENT ON COLUMN account_profiles.postal_code IS 'CEP (somente dígitos).';
COMMENT ON COLUMN account_profiles.district IS 'Bairro.';
