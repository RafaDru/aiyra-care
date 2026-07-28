-- Identity document types for Arquivos (separate clinical vs identification)

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'certidao_nascimento';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'rg';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'cpf_card';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'cnh';
