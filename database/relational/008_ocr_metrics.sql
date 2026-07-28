-- OCR success metrics for algorithm optimization (no LLM in product path)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ocr_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ocr_quality_score REAL,
  ADD COLUMN IF NOT EXISTS ocr_used_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ocr_parse_ok BOOLEAN,
  ADD COLUMN IF NOT EXISTS ocr_fields_found SMALLINT,
  ADD COLUMN IF NOT EXISTS ocr_fields_expected SMALLINT;

CREATE INDEX IF NOT EXISTS idx_documents_ocr_provider ON documents(ocr_provider);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_parse_ok ON documents(ocr_parse_ok);
