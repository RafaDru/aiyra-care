-- Catálogo de relações clínicas entre entidades canônicas + vínculos auditáveis (projetados no Neo4j)

CREATE TABLE IF NOT EXISTS relation_types (
  code VARCHAR(40) PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  from_entity_type VARCHAR(30) NOT NULL,
  to_entity_type VARCHAR(30) NOT NULL,
  neo4j_rel_type VARCHAR(40) NOT NULL,
  description TEXT,
  inverse_label VARCHAR(120)
);

INSERT INTO relation_types (code, label, from_entity_type, to_entity_type, neo4j_rel_type, description, inverse_label) VALUES
  ('ORDERED_EXAM', 'Solicitou exame', 'medical_record', 'exam', 'ORDERED', 'Consulta solicitou exame', 'Solicitado na consulta'),
  ('ORDERED_AUTH', 'Solicitou procedimento', 'medical_record', 'authorization', 'ORDERED', 'Consulta gerou pedido/autorização', 'Originado na consulta'),
  ('AUTHORIZED_FOR', 'Autorizou exame', 'authorization', 'exam', 'AUTHORIZED_FOR', 'Guia/autorização cobre o exame', 'Coberto pela autorização'),
  ('RESULT_OF', 'Resultado de', 'exam', 'authorization', 'RESULT_OF', 'Laudo vinculado à guia', 'Teve resultado'),
  ('PRESCRIBED', 'Prescreveu', 'medical_record', 'medication', 'PRESCRIBED', 'Medicamento prescrito na consulta', 'Prescrito na consulta'),
  ('CONFIRMS', 'Confirma', 'exam', 'diagnosis', 'CONFIRMS', 'Exame confirma diagnóstico', 'Confirmado por exame'),
  ('SUPPORTS_HYPOTHESIS', 'Suporta hipótese', 'exam', 'health_thread', 'SUPPORTS', 'Resultado endossa investigação/hipótese', 'Endossado por exame'),
  ('SUGGESTS_HYPOTHESIS', 'Sugere hipótese', 'exam', 'health_thread', 'SUGGESTS', 'Exame sugere nova linha de investigação', 'Sugerido por exame'),
  ('RELATED', 'Relacionado', 'clinical_entity', 'clinical_entity', 'RELATED', 'Associação clínica genérica', 'Relacionado')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS clinical_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  from_entity_type VARCHAR(30) NOT NULL,
  from_entity_id UUID NOT NULL,
  to_entity_type VARCHAR(30) NOT NULL,
  to_entity_id UUID NOT NULL,
  relation_code VARCHAR(40) NOT NULL REFERENCES relation_types(code),
  label VARCHAR(255),
  health_thread_id UUID REFERENCES health_threads(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_entity_type, from_entity_id, to_entity_type, to_entity_id, relation_code)
);

CREATE INDEX IF NOT EXISTS idx_clinical_entity_links_patient ON clinical_entity_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_entity_links_from ON clinical_entity_links(from_entity_type, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_clinical_entity_links_to ON clinical_entity_links(to_entity_type, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_clinical_entity_links_thread ON clinical_entity_links(health_thread_id);
