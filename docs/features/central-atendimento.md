# Central de atendimento (landing pública)

| Campo | Valor |
|-------|--------|
| **ID** | `central-atendimento` |
| **Tier** | 0 (copy / rota pública + categoria suporte) |
| **Status** | `done` (fase 1 — sem e-mail/telefone público) |
| **Categoria** | negócio |

## Resumo

Página pública **sem autenticação** em `/central-atendimento` para orientar famílias com CPF já cadastrado ou dificuldade de login. **Sem** e-mail ou telefone públicos (decisão 2026-10-07). Ajuda operacional via **Reportar problema** (logado), categoria **Conta, login e CPF**.

## Comportamento

| Superfície | Detalhe |
|----------|---------|
| Web | `CentralAtendimentoPage` — tom família, CTA login, nota sem e-mail público |
| Menu usuário (logado) | **Ajuda** no dropdown do avatar → `/central-atendimento` (`nav.help`) |
| Onboarding | HTTP 409 `CPF_ALREADY_LINKED` → i18n família + link `/central-atendimento` |
| API | `PatientService.create` valida unicidade de CPF; 409 com `code` |
| Suporte | Categoria `account_login_cpf` em `POST /support/reports` |
| Escalação | Thank-you pós-chamado + `support_resolution_prompt` — ver help |

## QA

Tier 0 — sem suite dedicada. Gates: `support-report-category.schema.test.ts` + `packages/web` build + `test:critical` em regressão.

## Ajuda

- [`docs/help/central-atendimento.md`](../help/central-atendimento.md) — inclui ladder agêntico → humano

## Decisões (2026-10-07)

- Sem e-mail público até domínio BR.
- Categoria «Conta, login e CPF» no modal de suporte.
- Prompt «resolveu?» após envio de chamado (slice mínimo).
