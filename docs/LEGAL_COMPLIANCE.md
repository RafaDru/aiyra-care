# Legal, LGPD e conformidade — AiyraCare

> **Última atualização:** 2026-08-13  
> **Status:** Estrutura inicial implementada — revisão jurídica pendente antes de go-live público.

Documento vivo: arquitetura, momento atual, histórico e referência ao backlog (`roadmap.json` → epic `legal-lgpd-compliance`).

---

## 1. Objetivo

Preparar o AiyraCare para **oferta a famílias externas** (B2C), com:

- Documentos legais **versionados** e auditáveis.
- **Aceite explícito** vinculado à `app_accounts`.
- Módulo hexagonal extensível para futuros provedores (DPO-as-a-service, CMS legal, e-sign).

**Não é assessoria jurídica.** Textos em `docs/legal/` são modelos operacionais.

---

## 2. Enquadramento regulatório (resumo)

| Área | Enquadramento atual | Ação |
|------|---------------------|------|
| **LGPD** | Dados sensíveis (saúde) + menores | Política, consentimento, direitos do titular |
| **ANVISA SaMD** | Organizador familiar, sem diagnóstico/tratamento | Manter disclaimers; revisar antes de IA clínica |
| **CFM / PEP** | Não é prontuário de clínica | Não prometer certificação SBIS |
| **CDC** | SaaS B2C com assinatura | Termos, cancelamento, reembolso |
| **Fiscal** | CNPJ + Contabilizei | NFS-e, Stripe payout na conta PJ |
| **Portais (scraping)** | Risco contratual com operadoras | Termos: usuário autoriza uso de credenciais |

Detalhe da conversa de produto: ver entrada em [`HISTORICO.md`](./HISTORICO.md) (2026-08-13).

---

## 3. Arquitetura hexagonal — módulo `legal-compliance`

Alinhado ao padrão `packages/api`: **domain → application → infrastructure**.

```
packages/api/src/
  domain/legal-compliance/
    legal-document-kind.ts      # kinds + required set
    legal-document.entity.ts
    legal-document.repository.ts   # port
    legal-acceptance.entity.ts
    legal-acceptance.repository.ts # port
  application/legal-compliance/
    legal-compliance.service.ts
    legal-content.port.ts          # port: leitura de markdown
  infrastructure/
    legal-compliance/
      fs-legal-content.adapter.ts  # adapter: filesystem (docs/legal)
    persistence/
      legal-compliance.pg.repository.ts
    http/legal-compliance/
      legal-compliance.routes.ts
      legal-compliance.controller.ts
      legal-compliance.schema.ts
```

### Ports (integrações externas futuras)

| Port | Uso hoje | Provedor futuro possível |
|------|----------|--------------------------|
| `LegalContentPort` | `fs` (default): `docs/legal/**/*.md` | `http`: `LEGAL_CMS_BASE_URL` · `gcs`: `LEGAL_CMS_GCS_BUCKET` — `LEGAL_CONTENT_ADAPTER` no `.env` |
| `LegalDocumentRepository` | Postgres | — |
| `LegalAcceptanceRepository` | Postgres | — |
| `ComplianceGatePort` (planejado) | Checagem em middleware | Policy engine externo |

O **Connect** (`packages/connect`) segue o mesmo princípio para portais de saúde; **legal-compliance** segue para regulatório.

---

## 4. Modelo de dados

Migration: [`database/relational/031_legal_compliance.sql`](../../database/relational/031_legal_compliance.sql)

### `legal_documents`

| Coluna | Descrição |
|--------|-----------|
| `kind` | `terms_of_use`, `privacy_policy`, … |
| `version` | Ex.: `1.0` |
| `content_path` | Caminho relativo no monorepo |
| `content_sha256` | Integridade do texto publicado |
| `is_current` | Uma versão vigente por `kind` |
| `requires_acceptance` | Se bloqueia uso sem aceite |
| `effective_at` | Data de vigência |

### `legal_document_acceptances`

| Coluna | Descrição |
|--------|-----------|
| `account_id` | FK `app_accounts` |
| `document_id` | FK versão aceita |
| `document_kind` / `document_version` | Snapshot denormalizado |
| `content_sha256` | Hash no momento do aceite |
| `acceptance_ip`, `user_agent` | Evidência opcional |

Constraint: `UNIQUE (account_id, document_id)` — reaceite de nova versão = nova linha.

---

## 5. API (momento atual)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/compliance/documents` | Público | Metadados das versões `is_current` |
| GET | `/compliance/documents/:kind/current` | Público | Markdown + metadados |
| GET | `/compliance/contact` | Público | E-mail privacidade/suporte e URLs legais |
| GET | `/compliance/go-live-status` | Público | Checklist técnico go-live (gate, CNPJ, docs, Stripe) |
| GET | `/compliance/status` | Bearer | Pendências e aceites da conta |
| POST | `/compliance/accept` | Bearer | Aceitar kinds ou lista de IDs |

Variáveis opcionais:

```env
LEGAL_CONTENT_ROOT=          # raiz dos markdowns (default: monorepo root)
LEGAL_PRIVACY_EMAIL=         # default privacidade@aiyracare.com
LEGAL_SUPPORT_EMAIL=         # suporte opcional
LEGAL_ENTITY_NAME=           # razão social (rodapé dos documentos)
LEGAL_CNPJ=                  # 14 dígitos
LEGAL_ENTITY_ADDRESS=        # opcional
COMPLIANCE_GATE_ENABLED=1    # produção: bloqueia rotas sem aceite
```

### Gate de rotas (API)

```env
COMPLIANCE_GATE_ENABLED=1   # produção: bloqueia rotas autenticadas se aceite pendente
```

Exceções: `/compliance/status`, `/compliance/accept`, `/auth/*`, documentos públicos, webhook Stripe.

Default: **desligado** (`0`) — UI (`RequireCompliance`) verifica pendência independentemente.

### Seed

```powershell
node packages/api/scripts/apply-migration-031.mjs
node packages/api/scripts/seed-legal-documents.mjs
```

---

## 6. Web (momento atual)

| Rota | Status |
|------|--------|
| `/termos` | Página pública lê API |
| `/privacidade` | Página pública lê API |
| `/compliance/accept` | Aceite obrigatório (autenticado, fora do gate) |
| Signup com checkbox + `POST /compliance/accept` | Implementado |
| `RequireCompliance` → redirect se pendente | Implementado |
| `/cookies` | Política de cookies |
| `/consentimento-menor` | Consentimento do responsável (público) |
| Banner cookies (`CookieConsentBanner`) | Implementado |
| Consentimento menor no cadastro de paciente | Implementado |
| Canal DPO em Configurações (`LegalContactCard`) | Implementado |

---

## 7. O que já existia no produto (base técnica)

- Supabase Auth + `app_accounts` + `patient_memberships`
- Disclaimer export clínico (“não substitui prontuário”)
- Stripe billing + entitlements
- Credenciais de portal criptografadas (`CRYPTO_KEY`)
- Share links com expiração (`clinical_export_shares`)

---

## 8. Backlog consolidado

Ver epic **`legal-lgpd-compliance`** em [`roadmap.json`](./roadmap.json).

Fases:

1. **Fase A (esta entrega)** — docs, migration, domínio, API, seed, páginas públicas.
2. **Fase B** — UI aceite + middleware `ComplianceGate`.
3. **Fase C** — exclusão de conta, cookie policy, canal DPO, consentimento menor, incident response ✅ (revisão jurídica e NFS-e pendentes).
4. **Fase D** — revisão ANVISA antes de agentes RAG clínicos.

---

## 9. Checklist go-live público

- [ ] Advogado revisa `terms-of-use/v1.0.md` e `privacy-policy/v1.0.md`
- [ ] CNPJ/razão social nos documentos e no site
- [ ] `privacidade@` e suporte operacionais
- [ ] Auth enforcement sempre on em produção
- [ ] Aceite obrigatório ativo
- [ ] Stripe live + NFS-e Contabilizei
- [ ] Processo de exclusão de dados documentado

Self-service: **Configurações → Conta → Excluir conta** (`DELETE /auth/account`, confirmação `EXCLUIR`). Remove pacientes com `owner_account_id`, arquivos GCS, memberships, Supabase Auth e cancela assinatura Stripe se houver.

---

## 10. Referências

- [`docs/legal/README.md`](./legal/README.md) — índice dos markdowns
- [`docs/legal/CHANGELOG.md`](./legal/CHANGELOG.md) — versões publicadas
- [`docs/BILLING.md`](./BILLING.md) — Stripe
- [`docs/ACCOUNT_AND_PLAN.md`](./ACCOUNT_AND_PLAN.md) — UI conta/plano/assinatura
- [`docs/HUMAN_REVIEW_QUEUE.md`](./HUMAN_REVIEW_QUEUE.md) — fila de revisão humana (badges no Roadmap UI)
- [`docs/SUPABASE.md`](./SUPABASE.md) — Auth
- LGPD — Lei 13.709/2018
- ANVISA RDC 657/2022 — SaMD (exceções para software sem finalidade diagnóstica)

---

## 11. Evidência de aceite: click-wrap vs DocuSign

### Para B2C (famílias) — **DocuSign não é necessário**

Termos de Uso e Política de Privacidade em SaaS consumer usam **click-wrap**:

- usuário marca “Li e aceito” (ou continua após aviso inequívoco);
- sistema registra **conta**, **versão**, **hash do texto**, **timestamp**;
- opcional: IP e user-agent.

Isso satisfaz a LGPD (consentimento **demonstrável**, art. 8) e prática de mercado (Stripe, Notion, etc.). **Não exige** assinatura manuscrita nem **certificado digital ICP-Brasil** para esse tipo de contrato.

Implementação AiyraCare: `legal_document_acceptances` + `content_sha256` + `legal_documents.version`.

### Quando DocuSign (ou similar) **pode** entrar

| Cenário | DocuSign? |
|---------|-----------|
| Aceite termos/privacidade por família no app | **Não** — click-wrap + auditoria |
| Cobrança recorrente (cartão) | Stripe Checkout / Customer Portal |
| Contrato **B2B** com clínica, operadora, parceiro | **Sim, frequentemente** |
| DPA formal entre CNPJs (suboperador) | **Às veis** — entre empresas, não com cada usuário |
| Consentimento de **procedimento médico** | Fora do escopo B2C organizador |
| Procuração, alto valor, fraude elevada | Sim |

DocuSign agrega **conveniência e evidência extra** em contratos interempresariais; **não é requisito regulatório** para termos de app familiar.

### “Mais formal” na LGPD

Formal = **audit trail** (versão + hash + quem aceitou), não necessariamente e-sign qualificada.

Nova versão de termos → novo `legal_documents` `is_current` → usuários com `pendingKinds` até reaceitar.

### Port futuro (hexagonal)

Se no futuro um contrato B2B exigir DocuSign: `LegalSignaturePort` com adapters `ClickWrapAdapter` (hoje) e `DocuSignAdapter` — sem mudar domínio de aceite.

