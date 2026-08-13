-- Documentos legais versionados + aceite vinculado à conta (LGPD / CDC)

CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  content_path TEXT NOT NULL,
  content_sha256 CHAR(64) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  requires_acceptance BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kind, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_documents_one_current_per_kind
  ON legal_documents (kind) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_legal_documents_kind ON legal_documents (kind);

CREATE TABLE IF NOT EXISTS legal_document_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES legal_documents(id),
  document_kind VARCHAR(50) NOT NULL,
  document_version VARCHAR(20) NOT NULL,
  content_sha256 CHAR(64) NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acceptance_ip VARCHAR(45),
  user_agent TEXT,
  UNIQUE (account_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_account ON legal_document_acceptances (account_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_document ON legal_document_acceptances (document_id);

COMMENT ON TABLE legal_documents IS 'Versões publicadas de termos, políticas e consentimentos; conteúdo canônico em docs/legal/.';
COMMENT ON TABLE legal_document_acceptances IS 'Registro imutável de aceite por conta; content_sha256 prova versão aceita.';
COMMENT ON COLUMN legal_documents.content_path IS 'Caminho relativo ao monorepo (ex.: docs/legal/privacy-policy/v1.0.md).';
COMMENT ON COLUMN legal_documents.content_sha256 IS 'SHA-256 do markdown no momento da publicação.';
