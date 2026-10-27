-- Relação de cuidado titular → paciente no círculo (onboarding Anel A)

ALTER TABLE patient_circle_links
  ADD COLUMN IF NOT EXISTS care_relation VARCHAR(32);

COMMENT ON COLUMN patient_circle_links.care_relation IS
  'Vínculo de cuidado no círculo: guardian, parent, grandparent, uncle_aunt, other, self';
