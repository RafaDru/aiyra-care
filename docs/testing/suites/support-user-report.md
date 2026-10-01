# Suite — `support-user-report`

| Campo | Valor |
|-------|--------|
| **ID** | `support-user-report` |
| **Feature** | [`support-user-reports`](../../features/support-user-reports.md) |
| **Lane** | `business-full` |
| **Fixture** | `core-demo` |
| **parallelSafe** | `true` |
| **Automação** | `done` |

## Pré-requisitos

- [ ] Migration 061 aplicada
- [ ] Usuário autenticado

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir fluxo “Reportar problema” (menu global) | Modal ou página abre | |
| 2 | Preencher descrição; manter «Incluir contexto técnico» marcado | Consentimento técnico default on | |
| 3 | Enviar | Toast sucesso; `POST /support/reports` 201 | |
| 4 | (Ops) Verificar em console `:3013` ou API | Report listado sem PHI indevido | |
