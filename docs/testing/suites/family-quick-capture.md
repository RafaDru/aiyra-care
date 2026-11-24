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
| 2 | Tipo **Nota**: título «Teste febre» + texto da nota | Título opcional; cria/vincula acompanhamento | |
| 2b | Campo **Quando aconteceu** (data/hora) em Nota | Visível; default agora; opcional ajustar antes de salvar | |
| 3 | **Salvar e registrar sinais vitais** | Permanece no drawer; tipo Medida; mesma thread selecionada | |
| 4 | Preencher temperatura e salvar | Toast; drawer fecha; medida com `health_thread_id` | |
| 5 | Salvar nota simples (sem continuar) | Toast «Registro salvo»; drawer fecha | |
| 6 | (API) `POST /health-threads/.../entries` ou criação de thread | 2xx | |
