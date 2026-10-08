# Suite — `dashboard-people-grouping`

| Campo | Valor |
|-------|--------|
| **ID** | `dashboard-people-grouping` |
| **Domínio** | `conta` |
| **Lane** | `regression`, `business-full` |
| **Fixture** | `core-demo` (login QA) |

Início (`/`) centrado em **perfis de saúde**: título «Quem você cuida», seletor de agrupamento (família / idade / A–Z), badge de pendências em **Sua família** na sidebar.

## Pré-requisitos

- [ ] API `:3010` e web `:5173` no ar
- [ ] Conta QA com ≥1 perfil (`qa.e2e@…`)

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Login → `/` | Heading **Quem você cuida**; subtítulo visível | |
| 2 | Toolbar `dashboard-group-mode-toolbar` | Segmented: Por família / Por idade / A–Z | |
| 3 | Alternar **Por idade** | Grupos Crianças / Adolescentes / Adultos (conforme perfis) | |
| 4 | Alternar **A–Z** | Lista «Todos» em ordem alfabética | |
| 5 | **Adicionar pessoa** (outline) | Modal «Adicionar pessoa» | |
| 6 | Sidebar **Sua família** | Item visível; badge só se houver convite/share pendente | |

## Automação

`packages/web/e2e/suites/dashboard-people-grouping.spec.ts` — smoke pós-login (heading + toolbar).

## Comandos

```powershell
npm run qa:run -- --suite dashboard-people-grouping
```

## Matriz

[`BUSINESS_ACTION_MATRIX.md`](../BUSINESS_ACTION_MATRIX.md) — «Dashboard / listar perfis».
