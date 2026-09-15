# Suite — `patient-clinical-export`

| Campo | Valor |
|-------|--------|
| **ID** | `patient-clinical-export` |
| **Feature** | [`patient-clinical-export`](../../features/patient-clinical-export.md) |
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
| 1 | Abrir perfil de paciente (aba básica) | Painel de contexto clínico visível | |
| 2 | Clicar **Levar na consulta** | Modal abre com modos Resumo/Completo | |
| 3 | Aguardar geração do link | Botão **Copiar link** habilitado | |
| 4 | Clicar **Copiar link** | Toast «Link copiado»; `POST .../clinical-export/shares` 201 | |
| 5 | Preencher e-mail do médico e **Enviar e-mail** | Toast sucesso; `POST .../shares/email` 202 | |
| 6 | Abrir URL em aba anônima | «Portal do médico», nome do paciente, feedback útil | |
| 7 | (Manual) Abrir com `?ref=` | Telemetria `referral_link_opened` no servidor | |
