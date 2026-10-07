# Central de atendimento (landing pública)

| Campo | Valor |
|-------|--------|
| **ID** | `central-atendimento` |
| **Tier** | 0 (copy / rota pública) |
| **Status** | `done` (estrutura; canais de contato pendentes) |
| **Categoria** | negócio |

## Resumo

Página pública **sem autenticação** em `/central-atendimento` para orientar usuários com CPF já cadastrado ou dificuldade de login. Canais de contato (telefone, WhatsApp, horários) ficam para spec futura — hoje só estrutura e copy neutra.

## Comportamento

| Superfície | Detalhe |
|----------|---------|
| Web | `CentralAtendimentoPage` — layout legal, link a termos/privacidade |
| Onboarding | HTTP 409 `CPF_ALREADY_LINKED` → i18n + link para `/central-atendimento` |
| API | `PatientService.create` valida unicidade de CPF antes do insert |

## QA

Tier 0 — sem suite dedicada. Gates: `npm run test:critical` + `packages/web` build.

## Ajuda

- [`docs/help/central-atendimento.md`](../help/central-atendimento.md)

## Pendências

- Spec de formas de contato (Rafael) → substituir placeholder na landing e help.
