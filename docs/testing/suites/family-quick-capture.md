# Suite — `family-quick-capture`

| Campo | Valor |
|-------|--------|
| **ID** | `family-quick-capture` |
| **Feature** | [`family-quick-capture`](../../features/family-quick-capture.md) |
| **Lane** | `business-full` |
| **Fixture** | `core-demo` |
| **parallelSafe** | `true` |
| **Automação** | `done` |

## Pré-requisitos

- [ ] API e web em execução
- [ ] Conta QA E2E com compliance aceito
- [ ] Pelo menos um paciente na conta

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Após login, clicar **Registro rápido** no header | Drawer abre com seletor de paciente e tipos | |
| 2 | Tipo **Nota** (default), preencher sintoma/nota | Campo obrigatório aceita texto | |
| 3 | Salvar | Toast «Registro salvo»; drawer fecha | |
| 4 | (API) `POST /health-threads/.../entries` ou criação de thread | 2xx | |
