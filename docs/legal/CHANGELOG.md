# Changelog — documentos legais

Formato: versão semver simples (`MAJOR.MINOR`); `MAJOR` = mudança que exige novo aceite.

## [1.0] — 2026-08-13

### Adicionado

- **Termos de Uso** `terms-of-use/v1.0.md`
- **Política de Privacidade** `privacy-policy/v1.0.md`
- **Política de Cookies** `cookie-policy/v1.0.md`
- **Consentimento do responsável** `minor-guardian-consent/v1.0.md`
- Banner de cookies + `GET /compliance/contact`
- Validação API ao cadastrar paciente menor (`MINOR_GUARDIAN_CONSENT_REQUIRED`)
- Mapa de tratamento e runbook de incidentes (operacional)

### Infraestrutura

- Migration `031_legal_compliance.sql`
- Módulo hexagonal `legal-compliance` na API

### Pendente (backlog)

- Revisão formal por advogado antes de go-live público
- NFS-e / fiscal (`legal-fiscal-nfse`)
- Revisão ANVISA antes de agentes RAG clínicos
