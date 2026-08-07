-- Entradas e vínculos de artefatos nas trilhas de saúde (workflow)

CREATE TABLE IF NOT EXISTS health_thread_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES health_threads(id) ON DELETE CASCADE,
  entry_type VARCHAR(30) NOT NULL DEFAULT 'note' CHECK (
    entry_type IN ('note', 'status_change', 'symptom', 'system')
  ),
  body TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_thread_entries_thread ON health_thread_entries(thread_id);

CREATE TABLE IF NOT EXISTS health_thread_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES health_threads(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL CHECK (
    entity_type IN ('exam', 'medical_record', 'authorization', 'diagnosis', 'document', 'appointment')
  ),
  entity_id UUID NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'related' CHECK (
    role IN ('ordered', 'scheduled', 'result', 'related', 'blocked_by')
  ),
  label VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thread_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_health_thread_links_thread ON health_thread_links(thread_id);
CREATE INDEX IF NOT EXISTS idx_health_thread_links_entity ON health_thread_links(entity_type, entity_id);
