-- Perfil estendido da conta (cuidador) — separado do paciente clínico

CREATE TABLE IF NOT EXISTS account_profiles (
  account_id UUID PRIMARY KEY REFERENCES app_accounts(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone VARCHAR(30),
  phone_secondary VARCHAR(30),
  whatsapp VARCHAR(30),
  cpf CHAR(11),
  birth_date DATE,
  gender VARCHAR(20),
  city VARCHAR(120),
  state CHAR(2),
  country CHAR(2) NOT NULL DEFAULT 'BR',
  timezone VARCHAR(64),
  locale VARCHAR(10),
  bio TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  x_url TEXT,
  facebook_url TEXT,
  preferred_contact VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_profiles_cpf ON account_profiles(cpf) WHERE cpf IS NOT NULL;

COMMENT ON TABLE account_profiles IS 'Dados de perfil do cuidador (contato, redes, bio); 1:1 com app_accounts.';
COMMENT ON COLUMN account_profiles.preferred_contact IS 'email | phone | whatsapp';
