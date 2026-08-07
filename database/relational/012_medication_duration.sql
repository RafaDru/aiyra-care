-- Duração, início efetivo (lembretes futuros) e término projetado.

ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS duration VARCHAR(100),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date_is_projected BOOLEAN NOT NULL DEFAULT false;

-- Migrar duração já salva em notes ("Duração: …")
UPDATE medications
SET duration = trim(substring(notes from 'Duração:\s*([^·]+)'))
WHERE duration IS NULL
  AND notes ~ 'Duração:';
