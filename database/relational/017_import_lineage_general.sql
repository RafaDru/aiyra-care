-- Linha de importação genérica: metadados de normalização + rastreio em mais tabelas

ALTER TABLE import_raw_records
  ADD COLUMN IF NOT EXISTS normalization JSONB;

ALTER TABLE development_milestones
  ADD COLUMN IF NOT EXISTS import_raw_id UUID REFERENCES import_raw_records(id);

COMMENT ON TABLE import_batches IS 'Lote de importação externa (um sync / upload por paciente+fonte).';
COMMENT ON TABLE import_raw_records IS 'Payload bruto da origem + metadados de normalização + link ao registro interno.';
COMMENT ON COLUMN import_raw_records.raw_json IS 'JSON fiel da origem; nunca o modelo interno.';
COMMENT ON COLUMN import_raw_records.normalization IS 'Metadados da conversão (método, score, slots de catálogo, etc.).';
