-- Pedidos de exame (agrupador opcional — portal ou manual).
CREATE TABLE exam_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  external_key VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  portal_order_id VARCHAR(255),
  order_date DATE,
  laboratory VARCHAR(255),
  result_file_url TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, external_key)
);

CREATE INDEX idx_exam_orders_patient ON exam_orders(patient_id);
CREATE INDEX idx_exam_orders_source ON exam_orders(source);

ALTER TABLE exams
  ADD COLUMN exam_order_id UUID REFERENCES exam_orders(id) ON DELETE SET NULL;

CREATE INDEX idx_exams_exam_order ON exams(exam_order_id);
