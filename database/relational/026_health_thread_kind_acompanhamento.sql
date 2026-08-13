-- Renomeia kind task → acompanhamento (UI já usa "Acompanhamento")

ALTER TABLE health_threads DROP CONSTRAINT IF EXISTS health_threads_kind_check;

UPDATE health_threads SET kind = 'acompanhamento' WHERE kind = 'task';

ALTER TABLE health_threads
  ADD CONSTRAINT health_threads_kind_check
  CHECK (kind IN ('acompanhamento', 'investigation', 'hypothesis', 'episode'));
