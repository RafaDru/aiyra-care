-- Ava: pins de contexto por conversa (transparência + compactação futura)

CREATE TABLE IF NOT EXISTS ava_session_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ava_conversations(id) ON DELETE CASCADE,
  entity_type VARCHAR(32) NOT NULL
    CHECK (entity_type IN ('exam', 'exam_order', 'exam_result_item', 'exam_marker')),
  entity_id VARCHAR(255) NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  label VARCHAR(255),
  source VARCHAR(16) NOT NULL DEFAULT 'user'
    CHECK (source IN ('user', 'accelerator', 'auto', 'inferred')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ava_session_context_conversation_active
  ON ava_session_context (conversation_id) WHERE active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ava_session_context_unique_pin
  ON ava_session_context (conversation_id, entity_type, entity_id);
