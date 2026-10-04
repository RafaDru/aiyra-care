-- Migration 077: refs humanas INC-/DEF- + trilha dispatch correção

CREATE TABLE IF NOT EXISTS ops_reference_sequences (
  kind VARCHAR(16) PRIMARY KEY CHECK (kind IN ('incident', 'defect')),
  next_val BIGINT NOT NULL DEFAULT 1
);

INSERT INTO ops_reference_sequences (kind, next_val)
VALUES ('incident', 1), ('defect', 1)
ON CONFLICT (kind) DO NOTHING;

ALTER TABLE ops_analysis_queue
  ADD COLUMN IF NOT EXISTS reference_code VARCHAR(16) NULL;

ALTER TABLE platform_defects
  ADD COLUMN IF NOT EXISTS reference_code VARCHAR(16) NULL;

ALTER TABLE platform_defects
  ADD COLUMN IF NOT EXISTS last_fix_dispatch_sent_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_analysis_queue_reference_code
  ON ops_analysis_queue (reference_code)
  WHERE reference_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_defects_reference_code
  ON platform_defects (reference_code)
  WHERE reference_code IS NOT NULL;

-- Backfill incidentes (ordem created_at)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM ops_analysis_queue
  WHERE reference_code IS NULL
)
UPDATE ops_analysis_queue q
SET reference_code = 'INC-' || LPAD(ordered.rn::text, 6, '0')
FROM ordered
WHERE q.id = ordered.id;

-- Backfill defeitos (ordem created_at)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM platform_defects
  WHERE reference_code IS NULL
)
UPDATE platform_defects d
SET reference_code = 'DEF-' || LPAD(ordered.rn::text, 6, '0')
FROM ordered
WHERE d.id = ordered.id;

UPDATE ops_reference_sequences s
SET next_val = GREATEST(
  s.next_val,
  COALESCE((
    SELECT MAX((regexp_replace(reference_code, '^INC-', ''))::bigint) + 1
    FROM ops_analysis_queue
    WHERE reference_code ~ '^INC-[0-9]+$'
  ), 1)
)
WHERE s.kind = 'incident';

UPDATE ops_reference_sequences s
SET next_val = GREATEST(
  s.next_val,
  COALESCE((
    SELECT MAX((regexp_replace(reference_code, '^DEF-', ''))::bigint) + 1
    FROM platform_defects
    WHERE reference_code ~ '^DEF-[0-9]+$'
  ), 1)
)
WHERE s.kind = 'defect';

-- Em correção sem dispatch aceito → aberto (piloto e PATCH legado)
UPDATE platform_defects
SET
  status = 'open',
  fix_started_at = NULL,
  updated_at = NOW()
WHERE status = 'in_fix'
  AND last_fix_dispatch_sent_at IS NULL;

COMMENT ON COLUMN ops_analysis_queue.reference_code IS
  'Ref humana estável (INC-000042) — UUID permanece canônico.';
COMMENT ON COLUMN platform_defects.reference_code IS
  'Ref humana estável (DEF-000007) — UUID permanece canônico.';
COMMENT ON COLUMN platform_defects.last_fix_dispatch_sent_at IS
  'Webhook defect_fix_v1 aceito (HTTP 2xx) — obrigatório para status in_fix.';
