-- CH uso ao vivo: consultas por created_at + dimensões de telemetria (sem PHI).

CREATE INDEX IF NOT EXISTS idx_product_events_usage_live
  ON product_events (created_at DESC)
  INCLUDE (account_id, session_id);

CREATE INDEX IF NOT EXISTS idx_product_events_screen_viewed_created
  ON product_events (created_at DESC, (properties->>'feature_key'))
  WHERE event_name = 'app_screen_viewed';

CREATE INDEX IF NOT EXISTS idx_client_errors_usage_bucket
  ON client_errors (created_at DESC, feature);