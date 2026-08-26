-- Ava: conversas persistidas + mensagens (companion platform MVP)

CREATE TABLE IF NOT EXISTS ava_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  health_thread_id UUID REFERENCES health_threads(id) ON DELETE SET NULL,
  title VARCHAR(200),
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ava_conversations_account_patient_activity
  ON ava_conversations (account_id, patient_id, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS ava_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ava_conversations(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ava_messages_conversation_created
  ON ava_messages (conversation_id, created_at ASC);

-- Liga telemetria LLM à conversa Ava
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_usage_events_conversation_id_fkey'
  ) THEN
    ALTER TABLE llm_usage_events
      ADD CONSTRAINT llm_usage_events_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES ava_conversations(id) ON DELETE SET NULL;
  END IF;
END $$;
