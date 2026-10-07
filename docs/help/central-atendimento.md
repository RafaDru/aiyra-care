# Central de atendimento

**ID:** `central-atendimento`  
**Feature:** `central-atendimento` (tier 0)

## Pergunta

O que fazer se meu CPF já está cadastrado ou não consigo entrar na conta?

## Resposta

O AiyraCare mantém uma página pública **Central de atendimento** (`/central-atendimento`) com orientações sobre CPF já vinculado e problemas de acesso. Durante o cadastro (onboarding), se o CPF já existir na base, o app mostra essa orientação e um link para a central.

## Formas de contato — spec pendente

> **Decisão pendente (Rafael):** telefone, WhatsApp, e-mail oficial, horários e SLA serão definidos em spec dedicada. Até lá, a landing usa copy neutra («Em breve publicaremos os canais») — sem números ou e-mails fictícios.

Quando a spec for publicada, atualizar:

- `packages/web/src/pages/central-atendimento.tsx` (bloco marcado `TODO(contact-spec)`)
- Esta seção e, se aplicável, `LEGAL_SUPPORT_EMAIL` / compliance contact

## Relacionado

- [`docs/features/central-atendimento.md`](../features/central-atendimento.md)
- Política INC: erros de negócio 409 (CPF duplicado) não abrem incidente técnico no CH
