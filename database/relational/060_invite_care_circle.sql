-- Vincula convites (058) a care circles (059)

ALTER TABLE patient_access_invites
  ADD COLUMN IF NOT EXISTS care_circle_id UUID REFERENCES care_circles(id) ON DELETE SET NULL;

ALTER TABLE patient_access_invites
  ADD COLUMN IF NOT EXISTS circle_role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (circle_role IN ('member', 'admin'));

CREATE INDEX IF NOT EXISTS idx_patient_access_invites_circle
  ON patient_access_invites (care_circle_id)
  WHERE care_circle_id IS NOT NULL;

COMMENT ON COLUMN patient_access_invites.care_circle_id IS 'Família alvo do convite — membro adicionado ao aceitar';
