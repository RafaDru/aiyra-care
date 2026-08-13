# Solicitações do titular (LGPD art. 18)

> Modelo operacional — não substitui orientação jurídica.

## Canal

E-mail: valor de `LEGAL_PRIVACY_EMAIL` (ex.: `privacidade@empresa.com`)

**SLA:** resposta em até **15 dias úteis** (`LEGAL_DPO_SLA_DAYS` no `.env` da API).

## Como o titular deve solicitar

1. E-mail ao canal de privacidade com assunto claro (ex.: "LGPD — acesso aos dados").
2. Identificação suficiente (e-mail da conta + confirmação de acesso ao login quando possível).
3. Descrição do pedido: acesso, correção, exclusão, portabilidade, revogação de consentimento, etc.

## O que o operador faz no AiyraCare

| Pedido | Ação no sistema |
|--------|-----------------|
| **Acesso** | Export clínico / dados da conta; logs de aceite em `legal_document_acceptances` |
| **Correção** | Editar paciente / perfil da conta |
| **Exclusão** | Configurações → Excluir conta (`DELETE /auth/account`) ou processo manual documentado |
| **Portabilidade** | Export PDF/JSON clínico + histórico de compras (`billing_purchases`) |
| **Revogação** | Encerrar conta ou remover integrações; documentar em ticket |

## Registro

Manter registro interno (e-mail/ticket) com: data do pedido, prazo, ação tomada, responsável.

## Relacionado

- [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) — incidentes de segurança (diferente de pedido titular)
- [`DATA_PROCESSING_MAP.md`](./DATA_PROCESSING_MAP.md)
- [`docs/LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md)
