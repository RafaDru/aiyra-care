# Suite — `family-day-to-day-discovery`

| Campo | Valor |
|-------|--------|
| **ID** | `family-day-to-day-discovery` |
| **Feature** | [`family-day-to-day-discovery`](../../features/family-day-to-day-discovery.md) |
| **Lane** | `business-full` |
| **Fixture** | `core-demo` |
| **parallelSafe** | `true` |
| **Automação** | `done` |

## Pré-requisitos

- [ ] API e web em execução
- [ ] Conta QA E2E com compliance aceito
- [ ] Hint `day-to-day-discovery-hub` **não** dismissado (sessão limpa ou `localStorage` sem entrada em `aiyracare.dismissedHints`)

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Login → dashboard `/` | Card «Dia a dia da família» visível (`data-testid=day-to-day-discovery-hub`) | |
| 2 | Clicar **Registrar agora** | Drawer «Registro rápido» abre (conta com perfil) | |
| 3 | Fechar drawer; clicar **Preparar consulta** | Modal «Levar na consulta» abre | |
| 4 | Fechar modal; dismiss (×) no card | Card some | |
| 5 | Recarregar página | Card não reaparece | |
