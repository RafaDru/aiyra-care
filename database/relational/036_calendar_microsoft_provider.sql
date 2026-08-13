-- Outlook / Microsoft Calendar como provider adicional

ALTER TABLE calendar_connections DROP CONSTRAINT IF EXISTS calendar_connections_provider_check;
ALTER TABLE calendar_connections ADD CONSTRAINT calendar_connections_provider_check
  CHECK (provider IN ('google', 'microsoft'));
