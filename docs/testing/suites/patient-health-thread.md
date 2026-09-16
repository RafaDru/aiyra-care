# Suite — `patient-health-thread`

| Campo | Valor |
|-------|--------|
| **ID** | `patient-health-thread` |
| **Feature** | [`patient-health-thread`](../../features/patient-health-thread.md) |
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
| 1 | Abrir perfil de paciente (aba básica) | Painel **Em acompanhamento** visível | |
| 2 | **Adicionar** → **Investigação** | Modal «Nova investigação» abre | |
| 3 | Preencher título e avançar etapas | Wizard completa 4 passos | |
| 4 | Clicar **Abrir investigação** | Toast «Investigação aberta»; `POST .../wizard/investigation` 201 | |
| 5 | Verificar lista ou drawer | Título da investigação visível | |
