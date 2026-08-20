-- Migration 045: Exam Result Items (Marcadores Médicos / Indicadores Clínicos)
-- Stores structured measurable analytes/markers extracted from lab reports (Glicose, Hemoglobina, TSH, PCR, etc.)

CREATE TABLE IF NOT EXISTS exam_result_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  marker_name TEXT NOT NULL,
  technical_name TEXT,
  numeric_value NUMERIC(12, 4),
  display_value TEXT NOT NULL,
  unit VARCHAR(50),
  reference_range TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'normal',
  collected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_result_items_patient_marker ON exam_result_items (patient_id, marker_name, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_result_items_exam ON exam_result_items (exam_id);
