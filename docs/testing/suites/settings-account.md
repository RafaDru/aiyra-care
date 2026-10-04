# Configurações — Conta (perfil + exclusão LGPD)

| Campo | Valor |
|-------|--------|
| **ID** | `settings-account` |
| **Lane** | `business` |
| **Automação** | `packages/web/e2e/suites/settings-account.spec.ts` (planejado) |

## Pré-requisitos

- Conta QA autenticada (`qa.e2e@aiyracare.local` ou usuário de teste dedicado — **não** usar conta pessoal de produção).
- API com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE` (rotas `/auth/*` ativas).
- Migration `032_account_profiles.sql` aplicada.

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Abrir `/settings/account` | Card de perfil carrega (e-mail visível); sem toast de erro |
| 2 | Editar nome → Salvar | Toast sucesso; valor persiste após F5 |
| 3 | *(Opcional, conta descartável)* Abrir modal Excluir conta → digitar `EXCLUIR` → confirmar | `DELETE /auth/account` 200; logout; conta removida |

## Falhas e observabilidade

| Sintoma | Verificar |
|---------|-----------|
| «Não foi possível carregar o perfil» | `GET /auth/profile` (404 = rota ausente ou conta PG órfã); API logs |
| Erro ao excluir / HTTP 404 | API desatualizada sem `DELETE /auth/account`; proxy dev (`vite.config.ts` inclui prefixo `auth`) |
| **Command Hub sem incidente** | Esperado: falhas geram `client_errors` (feature `account_settings`), **não** fila `ops_analysis_queue` — incidente exige `POST /support/reports` ou alerta ops |

## Cleanup

- Se executou passo 3, recriar usuário QA (`npm run qa:create-test-user` + `qa:seed-e2e-account`).

## Referências

- [`docs/ACCOUNT_AND_PLAN.md`](../../ACCOUNT_AND_PLAN.md)
- [`docs/LEGAL_COMPLIANCE.md`](../../LEGAL_COMPLIANCE.md) — exclusão art. 18
- [`docs/ops/SUPPORT_REPORTS.md`](../../ops/SUPPORT_REPORTS.md)
