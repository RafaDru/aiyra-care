# Plano de resposta a incidentes — AiyraCare

> **Última atualização:** 2026-08-13  
> Runbook operacional — validar prazos e obrigações com advogado (LGPD art. 48).

## Objetivo

Procedimento quando há suspeita de **acesso não autorizado**, perda, alteração ou exposição indevida de dados pessoais ou sensíveis.

## Classificação rápida

| Nível | Exemplo | Ação imediata |
|-------|---------|----------------|
| **P1 — Crítico** | Vazamento de credenciais de portal, dump de PG, bucket GCS público | Contenção em &lt; 1h, war room |
| **P2 — Alto** | Acesso indevido a conta autenticada, token de export exposto | Contenção em &lt; 4h |
| **P3 — Médio** | Log com PII excessivo, falha de auth temporária | Investigar em 24h |

## Checklist de resposta

### 1. Conter

- [ ] Revogar sessões Supabase / rotacionar chaves se comprometidas (`SUPABASE_SERVICE_ROLE`, `CRYPTO_KEY`)
- [ ] Desabilitar share links ativos se token vazado (`clinical_export_shares`)
- [ ] Bloquear IP ou conta suspeita via Supabase / WAF
- [ ] Preservar evidências (logs, timestamps) — **não** apagar antes da análise

### 2. Avaliar escopo

- [ ] Quais `app_accounts`, `patients`, documentos GCS?
- [ ] Dados sensíveis (saúde) envolvidos?
- [ ] Menores afetados?
- [ ] Linha do tempo: detecção → contenção → causa raiz

### 3. Registrar

- Linha do tempo interna em ticket (data, responsável, ação)
- Atualizar seção **Post-mortem** abaixo

### 4. Notificar (validar com jurídico)

- [ ] Titulares afetados — canal: e-mail + in-app se aplicável
- [ ] ANPD — se incidente com risco ou dano relevante (art. 48 LGPD)
- [ ] Documentar decisão de notificar ou não

### 5. Corrigir e recuperar

- [ ] Patch de código / config
- [ ] Restaurar backup se necessário (Postgres, GCS)
- [ ] Reexecutar seed legal se aceites comprometidos (caso extremo)

### 6. Post-mortem

- Causa raiz, ações corretivas, owners, prazo
- Atualizar este runbook e [`LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md)

## Contatos

| Função | Contato |
|--------|---------|
| Privacidade / LGPD | privacidade@aiyracare.com (`LEGAL_PRIVACY_EMAIL`) |
| Infra / GCP | [responsável técnico] |
| Jurídico | [advogado] |

API pública: `GET /compliance/contact` retorna e-mails configurados.

## Referências técnicas

- Auth: `packages/api/src/infrastructure/http/auth/security.plugin.ts`
- Credenciais portal: `CRYPTO_KEY`, `encrypted_session_token`
- Exclusão de dados: `AccountDeletionService`, `DELETE /auth/account`
- Aceites: `legal_document_acceptances`
