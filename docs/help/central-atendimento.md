# Central de atendimento

**ID:** `central-atendimento`  
**Feature:** `central-atendimento` (tier 0)

## Pergunta

O que fazer se meu CPF já está cadastrado ou não consigo entrar na conta?

## Resposta

O AiyraCare mantém uma página pública **Central de atendimento** (`/central-atendimento`) com orientações em tom de família/cuidador — sem e-mail ou telefone públicos nesta fase.

1. Tente **entrar** com o e-mail que você usa no dia a dia ou recupere o acesso pelo provedor de login.
2. Se ainda precisar de ajuda, **entre na conta** e use **Reportar problema** no menu. Escolha a categoria **Conta, login e CPF** para dúvidas de cadastro ou acesso.

Durante o cadastro (onboarding), se o CPF já existir na base, o app mostra essa orientação e um link para a central.

## Canais (decisão 2026-10-07)

| Canal | Fase 1 |
|-------|--------|
| E-mail público / domínio BR | **Não** — registro ainda não feito |
| Telefone / WhatsApp | **Não** — evitar números fictícios |
| Landing `/central-atendimento` | Sim — copy família + CTA login |
| **Reportar problema** (logado) | Sim — categoria «Conta, login e CPF» |

## Escalação agêntica → humano

Princípio: respostas primeiro por **agentes**; acionamento humano (operador estratégico) só quando a calibração indicar.

### Prompt «resolveu?»

Depois de qualquer retorno **visível ao usuário** que seja agêntico (confirmação de chamado, ack automático, resumo de investigação, mudança de status exibida no app):

1. Perguntar: **«Isso resolveu sua dúvida ou problema?»** — **Sim** / **Ainda não**.
2. Registrar telemetria `support_resolution_prompt` com:
   - `source` — superfície (ex.: `support_report_thank_you`)
   - `report_id` — id do chamado (truncado, sem PHI)
   - `decision` — `yes` | `no`
   - `human_escalation_delta` — `0` (sim) ou `1` (não)
   - `human_escalation_score` — soma na sessão do navegador (provisório até coluna PG)

### Regras propostas de score e `needs_human_review`

| Evento | Efeito no score |
|--------|-----------------|
| `decision=yes` | +0 (não incrementa) |
| `decision=no` | +1 (`human_escalation_delta=1`) |
| Categoria `account_login_cpf` no chamado | peso +1 na **primeira** avaliação «não» do mesmo `report_id` (fase 2 — agregar no backend) |
| Severidade LGPD / conta bloqueada | +2 imediato (fase 2 — via triagem CH) |

**Threshold sugerido (fase 2 — Postgres / CH):**

- Marcar `support_reports.needs_human_review = true` quando:
  - **≥ 2** eventos `support_resolution_prompt` com `decision=no` no **mesmo** `report_id`, **ou**
  - `human_escalation_score` agregado ≥ **3** na janela de 7 dias da conta, **ou**
  - triagem CH já classificou o incidente como `blocked` / LGPD.

**Notificação ao operador humano (Rafael):** somente quando `needs_human_review` estiver true **e** fila CH sem resposta agêntica útil nas últimas 24h — não na primeira «não».

### Implementação incremental (merge atual)

- UI: após enviar **Reportar problema**, thank-you + chips Sim / Ainda não (`SupportResolutionPrompt`).
- Telemetria: `support_resolution_prompt` na allowlist da API.
- Coluna `needs_human_review` e notificação: **backlog** — agregar eventos no connect-worker ou job ops.

## Relacionado

- [`docs/features/central-atendimento.md`](../features/central-atendimento.md)
- [`docs/features/support-user-reports.md`](../features/support-user-reports.md)
- Política INC: erros de negócio 409 (CPF duplicado) não abrem incidente técnico no CH
