-- Migration 046: Idempotência para exam_result_items
-- 1. Adiciona source_document_id (rastreabilidade da origem do marcador)
-- 2. Unique index (patient_id, marker_name, collected_at, display_value) — evita duplicatas de re-runs
-- 3. Limpa duplicatas existentes mantendo a linha mais antiga (canonical)

ALTER TABLE exam_result_items ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Limpeza: mantém a primeira ocorrência (menor created_at/id) de cada grupo duplicado
DELETE FROM exam_result_items a
 USING exam_result_items b
 WHERE a.patient_id = b.patient_id
   AND LOWER(a.marker_name) = LOWER(b.marker_name)
   AND a.collected_at = b.collected_at
   AND LOWER(a.display_value) = LOWER(b.display_value)
   AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_result_items_dedup
  ON exam_result_items (patient_id, LOWER(marker_name), collected_at, LOWER(display_value));

CREATE INDEX IF NOT EXISTS idx_exam_result_items_source_doc ON exam_result_items (source_document_id);
