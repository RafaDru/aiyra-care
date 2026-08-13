-- Foto do médico (GCS) e documento PDF da guia

ALTER TABLE authorizations
  ADD COLUMN IF NOT EXISTS doctor_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS guide_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_authorizations_guide_document ON authorizations(guide_document_id);
