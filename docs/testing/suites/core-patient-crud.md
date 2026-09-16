# Suite — `core-patient-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `core-patient-crud` |
| **Domínio** | `conta` |
| **Lane** | `regression`, `business-full` |
| **Fixture** | login real + pacientes `QA-*` |

Ciclo CRUD de **paciente** — ver passos completos (criar adulto/menor, editar, excluir, cleanup).

> Alias histórico: `core-auth-dashboard`

## Pré-requisitos

- [ ] `npm run up` · conta QA onboarding resetada — [`onboarding-flow`](../suites/onboarding-flow.md) ou conta `qa.e2e` já com perfil — [`AUTH_TESTING.md`](../AUTH_TESTING.md)

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Login → dashboard | Lista carrega | |
| 2 | **Novo Paciente** `QA-Adulto-<data>` (≥18 anos) | Criado; card visível | |
| 3 | Abrir perfil | Abas carregam | |
| 4 | **Novo Paciente** `QA-Menor-<data>` + consentimento menor | Criado | |
| 5 | Editar adulto → `QA-Adulto-<data>-editado` | Nome persiste | |
| 6 | Excluir menor (confirmar) | Sumiu do dashboard | |
| 7 | Excluir adulto editado | Sumiu; sem `QA-*` restante | |

## Automação Playwright

`packages/web/e2e/suites/core-patient-crud.spec.ts` — requer `qa.e2e@…` com **perfil titular** (`npm run qa:create-test-user` + onboarding completo uma vez).

```powershell
npm run test:e2e:regression
```

## Matriz

[`BUSINESS_ACTION_MATRIX.md`](../BUSINESS_ACTION_MATRIX.md) — linha «Criar / editar / excluir paciente».
