-- 009: Área do plano (compartilhada Unimed / Amil / outros)
-- InsurancePlan = catálogo do produto; PlanMembership = vínculo paciente ↔ plano

CREATE TABLE IF NOT EXISTS insurance_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator VARCHAR(50) NOT NULL,
  operator_name VARCHAR(255),
  plan_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(100),
  network_name VARCHAR(255),
  network_code VARCHAR(100),
  segmentation VARCHAR(255),
  accommodation VARCHAR(100),
  geographic_coverage VARCHAR(100),
  regulation_type VARCHAR(100),
  contract_type VARCHAR(100),
  contractor_name VARCHAR(255),
  add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,
  waiting_periods JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_key VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator, external_key)
);

CREATE INDEX IF NOT EXISTS idx_insurance_plans_operator ON insurance_plans(operator);

CREATE TABLE IF NOT EXISTS plan_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  insurance_plan_id UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
  integration_link_id UUID REFERENCES integration_links(id) ON DELETE SET NULL,
  member_number VARCHAR(50),
  role VARCHAR(30) NOT NULL DEFAULT 'holder',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  cns VARCHAR(20),
  inclusion_date DATE,
  card_valid_from DATE,
  card_valid_to DATE,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, insurance_plan_id, member_number)
);

CREATE INDEX IF NOT EXISTS idx_plan_memberships_patient ON plan_memberships(patient_id);
CREATE INDEX IF NOT EXISTS idx_plan_memberships_plan ON plan_memberships(insurance_plan_id);
