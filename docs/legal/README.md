# Documentos legais — AiyraCare

Repositório canônico de **termos, políticas e consentimentos** com versionamento explícito.

## Estrutura

```
docs/legal/
  README.md                 ← este índice
  CHANGELOG.md              ← histórico de versões publicadas
  DATA_PROCESSING_MAP.md    ← mapa LGPD (operacional)
  INCIDENT_RESPONSE.md      ← runbook vazamento (operacional)
  LAWYER_REVIEW_CHECKLIST.md
  FISCAL_NFSE.md            ← NFS-e + Contabilizei
  ANVISA_SAMD_POSITION.md   ← gate antes de RAG clínico
  terms-of-use/
    v1.0.md
  privacy-policy/
    v1.0.md
  cookie-policy/
    v1.0.md
  minor-guardian-consent/
    v1.0.md
```

Cada arquivo `.md` é a **fonte de verdade** do texto exibido ao usuário.

## Fluxo de publicação

1. Editar markdown em `docs/legal/<kind>/vX.Y.md`.
2. Revisão jurídica (obrigatório antes de produção pública).
3. Registrar em `CHANGELOG.md`.
4. Rodar seed: `node packages/api/scripts/seed-legal-documents.mjs` (calcula hash e upsert no PG).
5. Nova versão torna-se `is_current`; usuários sem aceite da nova versão ficam **pendentes** até aceitar.

## Kinds (`legal_document_kind`)

| Kind | Obrigatório para uso | Descrição |
|------|----------------------|-----------|
| `terms_of_use` | Sim | Termos de Uso do serviço |
| `privacy_policy` | Sim | Política de Privacidade (LGPD) |
| `cookie_policy` | Informativo (+ banner) | Cookies essenciais e preferências |
| `minor_guardian_consent` | Condicional | Ao cadastrar paciente &lt; 18 anos |

## API

- `GET /compliance/documents` — metadados das versões vigentes (público)
- `GET /compliance/documents/:kind/current` — texto markdown + metadados (público)
- `GET /compliance/status` — pendências de aceite (autenticado)
- `POST /compliance/accept` — registrar aceite (autenticado)

Ver [`LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md) para arquitetura hexagonal e backlog.

## Aviso

Os textos em `v1.0.md` são **modelos operacionais** para estruturar o produto. **Não substituem assessoria jurídica** antes de cobrança ou oferta ampla ao público.
