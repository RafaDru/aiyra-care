-- Diretório nacional de emergência (oficial) + contatos por paciente

CREATE TABLE IF NOT EXISTS emergency_directory (
  id VARCHAR(64) PRIMARY KEY,
  category VARCHAR(32) NOT NULL,
  scope VARCHAR(16) NOT NULL DEFAULT 'national' CHECK (scope IN ('national', 'state', 'city')),
  state_code CHAR(2),
  city_name VARCHAR(120),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  phone_alt VARCHAR(40),
  description TEXT,
  instructions TEXT,
  source_url VARCHAR(500),
  official_org VARCHAR(200),
  available_24h BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_directory_category ON emergency_directory(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_emergency_directory_scope ON emergency_directory(scope, state_code);

CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  phone_alt VARCHAR(40),
  relationship VARCHAR(100),
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_emergency_contacts_patient
  ON patient_emergency_contacts(patient_id)
  WHERE deleted_at IS NULL;

-- Seed: apenas canais oficiais nacionais (fontes gov.br / Anvisa / CVV / Butantan)
INSERT INTO emergency_directory (id, category, scope, name, phone, description, instructions, source_url, official_org, available_24h, sort_order) VALUES
  ('samu_192', 'medical', 'national', 'SAMU — Urgência e Emergência', '192',
   'Atendimento móvel de urgência: orientação e envio de ambulância quando necessário.',
   'Ligação gratuita. Inclui intoxicação, envenenamento, problemas cardiorrespiratórios e outras urgências.',
   'https://www.gov.br/saude/pt-br/composicao/saes/samu-192', 'Ministério da Saúde / SAMU', true, 10),
  ('bombeiros_193', 'fire_rescue', 'national', 'Corpo de Bombeiros', '193',
   'Incêndios, afogamentos, resgates, acidentes com vítimas e emergências em ambientes hostis.',
   'Tenha o endereço completo e descrição da situação. Casos clínicos graves também podem exigir SAMU (192).',
   'https://www.gov.br', 'Corpo de Bombeiros Militar', true, 20),
  ('pm_190', 'police', 'national', 'Polícia Militar — Emergência', '190',
   'Emergência policial: crimes em andamento, violência, situações de risco imediato.',
   'Use em situações que exigem presença policial imediata.',
   'https://www.gov.br', 'Polícias estaduais', true, 30),
  ('prf_191', 'police', 'national', 'Polícia Rodoviária Federal', '191',
   'Emergências em rodovias federais: acidentes, crimes, assistência em estradas federais.',
   'Informe localização (km, rodovia) e condição das vítimas.',
   'https://www.gov.br/prf', 'Polícia Rodoviária Federal', true, 40),
  ('cvv_188', 'mental_health', 'national', 'CVV — Centro de Valorização da Vida', '188',
   'Apoio emocional e prevenção do suicídio. Atendimento sigiloso por voluntários.',
   'Ligação gratuita 24h. Também disponível por chat e e-mail (cvv.org.br).',
   'https://cvv.org.br/', 'CVV', true, 50),
  ('disque_intoxicacao', 'poison', 'national', 'Disque-Intoxicação (Anvisa)', '0800-722-6001',
   'Orientação sobre intoxicações e envenenamentos; conecta ao CIATox/CEATOX da região.',
   'Em emergência grave, ligue também ao SAMU (192) e procure atendimento presencial.',
   'https://www.gov.br/anvisa/pt-br/assuntos/agrotoxicos/disque-intoxicacao', 'Anvisa / Renaciat', true, 60),
  ('ligue_180', 'violence_support', 'national', 'Ligue 180 — Violência contra a mulher', '180',
   'Denúncias e orientação sobre violência contra a mulher.',
   'Atendimento gratuito. Em risco imediato, ligue também 190.',
   'https://www.gov.br/mdh', 'Ministério das Mulheres', true, 70),
  ('disque_100', 'human_rights', 'national', 'Disque 100 — Direitos Humanos', '100',
   'Denúncias de violações de direitos humanos.',
   'Canal do Ministério dos Direitos Humanos e da Cidadania.',
   'https://www.gov.br/mdh', 'MDHC', true, 80),
  ('defesa_civil_199', 'civil_defense', 'national', 'Defesa Civil (muitos municípios)', '199',
   'Desastres, desabamentos, alagamentos e calamidades — disponibilidade varia por município.',
   'Confirme se o 199 está ativo na sua cidade; em urgência médica use SAMU (192).',
   'https://www.gov.br/mdh', 'Defesa Civil municipal/estadual', true, 90),
  ('peconhentos_samu', 'venomous_animal', 'national', 'Animal peçonhento — procure atendimento médico', '192',
   'Picada de cobra, aranha, escorpião ou lagarta: lave com água e sabão e busque hospital/SAMU.',
   'Não use torniquete, não corte o local, não aplique substâncias. Soros antiveneno são via rede pública (SUS).',
   'https://www.butantan.gov.br/soros', 'Ministério da Saúde / SUS', true, 100),
  ('butantan_orientacao_sp', 'venomous_animal', 'state', 'Butantan — orientação profissional (SP)', '(11) 2627-9528',
   'Orientação telefônica 24h para profissionais de saúde e casos em São Paulo (Hospital Vital Brazil).',
   'População: em emergência ligue 192 e vá ao hospital. Linha para orientação especializada.',
   'https://butantan.gov.br/visitacao-e-servicos/acidentes-com-animais-peconhentos', 'Instituto Butantan', true, 110)
ON CONFLICT (id) DO NOTHING;

UPDATE emergency_directory SET state_code = 'SP' WHERE id = 'butantan_orientacao_sp';
