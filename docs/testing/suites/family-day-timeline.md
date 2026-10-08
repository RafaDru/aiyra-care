# Suite — `family-day-timeline`

| Campo | Valor |
|-------|--------|
| **ID** | `family-day-timeline` |
| **Feature** | [`family-day-timeline`](../../features/family-day-timeline.md) |
| **Lane** | `business-full` |
| **Fixture** | `core-demo` |
| **parallelSafe** | `true` |
| **Automação** | `done` |

## Pré-requisitos

- [ ] API e web em execução
- [ ] Conta QA E2E com compliance aceito

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir perfil de paciente | Página do paciente carrega | |
| 2 | Clicar aba **Carteira** | Aba ativa | |
| 3 | Verificar bloco **Hoje** | Título «Hoje» visível (sem botão duplicado de Registro rápido) | |
| 4 | Clicar **Registro rápido** no header | Drawer de captura abre | |
