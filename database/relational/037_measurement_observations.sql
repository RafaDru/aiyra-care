-- Catálogo de tipos mensuráveis + observações temporais + administração de medicação (monitoramento dia-a-dia)

CREATE TABLE IF NOT EXISTS measurement_types (
  code VARCHAR(64) PRIMARY KEY,
  category VARCHAR(32) NOT NULL
    CHECK (category IN ('anthropometry', 'vital_sign', 'lab_point', 'symptom', 'derived')),
  label_key VARCHAR(120) NOT NULL,
  default_unit VARCHAR(24),
  value_kind VARCHAR(24) NOT NULL DEFAULT 'scalar'
    CHECK (value_kind IN ('scalar', 'composite', 'occurrence')),
  precision SMALLINT NOT NULL DEFAULT 1,
  normal_range JSONB,
  chart_config JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
  sort_order INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS measurement_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type_code VARCHAR(64) NOT NULL REFERENCES measurement_types(code),
  observed_at TIMESTAMPTZ NOT NULL,
  value_numeric NUMERIC(12, 4),
  value_secondary NUMERIC(12, 4),
  unit VARCHAR(24),
  source VARCHAR(32) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'import', 'device', 'computed', 'legacy_growth')),
  source_ref VARCHAR(120),
  health_thread_id UUID REFERENCES health_threads(id) ON DELETE SET NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_measurement_obs_patient_time
  ON measurement_observations(patient_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurement_obs_patient_type_time
  ON measurement_observations(patient_id, type_code, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurement_obs_health_thread
  ON measurement_observations(health_thread_id) WHERE health_thread_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS medication_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE SET NULL,
  medication_name VARCHAR(500) NOT NULL,
  administered_at TIMESTAMPTZ NOT NULL,
  dose_given VARCHAR(200),
  health_thread_id UUID REFERENCES health_threads(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_admin_patient_time
  ON medication_administrations(patient_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_admin_health_thread
  ON medication_administrations(health_thread_id) WHERE health_thread_id IS NOT NULL;

-- Seed catálogo inicial
INSERT INTO measurement_types (code, category, label_key, default_unit, value_kind, precision, normal_range, chart_config, sort_order) VALUES
  ('weight', 'anthropometry', 'measurement.type.weight', 'kg', 'scalar', 2, NULL,
   '{"enabled":true,"chartKind":"line","color":"#1677ff","yAxisGroup":"mass"}'::jsonb, 20),
  ('height', 'anthropometry', 'measurement.type.height', 'cm', 'scalar', 1, NULL,
   '{"enabled":true,"chartKind":"line","color":"#52c41a","yAxisGroup":"length"}'::jsonb, 21),
  ('head_circumference', 'anthropometry', 'measurement.type.head_circumference', 'cm', 'scalar', 1, NULL,
   '{"enabled":true,"chartKind":"line","color":"#722ed1"}'::jsonb, 22),
  ('temperature', 'vital_sign', 'measurement.type.temperature', '°C', 'scalar', 1,
   '{"min":36,"max":37.5,"criticalLow":35.5,"criticalHigh":38}'::jsonb,
   '{"enabled":true,"chartKind":"line","color":"#fa541c"}'::jsonb, 10),
  ('heart_rate', 'vital_sign', 'measurement.type.heart_rate', 'bpm', 'scalar', 0,
   '{"min":60,"max":100,"criticalLow":50,"criticalHigh":140}'::jsonb,
   '{"enabled":true,"chartKind":"line","color":"#eb2f96"}'::jsonb, 11),
  ('spo2', 'vital_sign', 'measurement.type.spo2', '%', 'scalar', 0,
   '{"min":95,"max":100,"criticalLow":90}'::jsonb,
   '{"enabled":true,"chartKind":"area","color":"#13c2c2"}'::jsonb, 12),
  ('blood_pressure', 'vital_sign', 'measurement.type.blood_pressure', 'mmHg', 'composite', 0, NULL,
   '{"enabled":true,"chartKind":"dual-line","components":[{"code":"systolic","color":"#cf1322"},{"code":"diastolic","color":"#1677ff"}]}'::jsonb, 13),
  ('glucose', 'lab_point', 'measurement.type.glucose', 'mg/dL', 'scalar', 0,
   '{"min":70,"max":99,"criticalHigh":180}'::jsonb,
   '{"enabled":true,"chartKind":"line","color":"#faad14"}'::jsonb, 30),
  ('vomit', 'symptom', 'measurement.type.vomit', NULL, 'occurrence', 0, NULL,
   '{"enabled":false}'::jsonb, 40),
  ('stool_abnormal', 'symptom', 'measurement.type.stool_abnormal', NULL, 'occurrence', 0, NULL,
   '{"enabled":false}'::jsonb, 41)
ON CONFLICT (code) DO NOTHING;
