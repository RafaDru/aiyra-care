-- Jobs de sincronização persistidos (manual; futuro agendado)
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY,
  integration_link_id UUID NOT NULL REFERENCES integration_links(id) ON DELETE CASCADE,
  portal_type TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  step TEXT,
  message TEXT,
  step_details JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  novelty JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_link_started ON sync_jobs (integration_link_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_link_running ON sync_jobs (integration_link_id, status)
  WHERE status IN ('pending', 'running');
