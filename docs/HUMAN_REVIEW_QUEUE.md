# Fila de revisão humana / profissional

Tecnologia de go-live está **pronta no código**; o que falta é parecer externo sobre **conteúdo, fiscal, regulatório, médico ou segurança**.

No app: menu **Roadmap** → seção **Revisão humana pendente** (badges por profissão).

Fonte estruturada: `docs/roadmap.json` (`reviewBadges` + `reviewBadge` nos itens). Épico agregador: `human-review-gates`.

## Jurídico + conteúdo

| Item | Artefato | Responsável |
|------|----------|-------------|
| Textos legais v1.0 | `docs/legal/LAWYER_REVIEW_CHECKLIST.md` + `docs/legal/**/v1.0.md` | Advogado |
| DPO / titular | `LEGAL_PRIVACY_EMAIL`, `DATA_SUBJECT_REQUEST.md`, SLA na UI | Advogado / DPO (e-mail real em prod) |
| Stripe live + razão social | `LEGAL_ENTITY_NAME`, `LEGAL_CNPJ` no `.env` | Advogado + contador |

## Fiscal

| Item | Artefato | Responsável |
|------|----------|-------------|
| NFS-e + Contabilizei | `docs/legal/FISCAL_NFSE.md`, script + `GET /billing/export/contabilizei` | Contador / Contabilizei |
| Cobrança recorrente live | Stripe dashboard live, webhook HTTPS | Contador |

## Regulatório (ANVISA / SaMD)

| Item | Artefato | Responsável |
|------|----------|-------------|
| Posicionamento SaMD | `docs/legal/ANVISA_SAMD_POSITION.md` | Consultor regulatório |
| Agentes RAG clínicos | Não implementar até parecer | Consultor + médico |

## Médico + conteúdo clínico

| Item | Artefato | Responsável |
|------|----------|-------------|
| Export clínico / share | `packages/web/src/components/patient/clinical-export-copy.ts` | Pediatra / clínico |
| Interpretação manuscrito | disclaimers na UI de documentos | Pediatra / clínico |
| Agentes (futuro) | roadmap épico `agentes` | Pediatra + regulatório |

## Segurança

| Item | Artefato | Responsável |
|------|----------|-------------|
| Go-live público | `COMPLIANCE_GATE_ENABLED=1`, `docs/FEATURE_REVIEW_FRAMEWORK.md` tier 3 | Pentest / auditor (opcional) |

## Checklist técnico já entregue (não bloqueia revisão)

- Gate de compliance + cookie banner + consentimento menor
- `GET /compliance/go-live-status` + card em Configurações
- Seed de 4 documentos legais + páginas/modal largos
- Billing Stripe (checkout, webhook, portal) — aguarda **live keys**
- Export fiscal CSV (API + UI operador + script)
- PR template + workflow tier-3 reminder
- Ver também: `docs/GO_LIVE_TECHNICAL_READINESS.md`

## Como marcar concluído

1. Receber parecer (e-mail/PDF do profissional).
2. Ajustar markdown ou copy se necessário.
3. No `docs/roadmap.json`, mudar `status` do item de `planned`/`in_progress` → `done`.
4. Registrar decisão em `docs/HISTORICO.md`.
