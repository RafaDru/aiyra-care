-- Trilhas de saúde ("Em andamento"): tarefas, investigações, hipóteses, episódios

CREATE TABLE IF NOT EXISTS health_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('task', 'investigation', 'hypothesis', 'episode')),
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'active', 'paused', 'resolved', 'ruled_out', 'converted')
  ),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  confidence VARCHAR(20) CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  due_date DATE,
  created_by UUID REFERENCES app_accounts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_threads_patient ON health_threads(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_threads_patient_status ON health_threads(patient_id, status);
