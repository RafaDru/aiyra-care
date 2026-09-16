# Suite — `support-user-report`

| Campo | Valor |
|-------|--------|
| **ID** | `support-user-report` |
| **Feature** | [`support-user-reports`](../../features/support-user-reports.md) |
| **Lane** | `business-full` |
| **Fixture** | `core-demo` |
| **parallelSafe** | `true` |
| **Automação** | `done` — `packages/web/e2e/suites/support-user-report.spec.ts` |

## Pré-requisitos

- [ ] Migration 061 aplicada
- [ ] API e web em execução
- [ ] Conta QA E2E com compliance aceito

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir fluxo «Reportar problema» (header global) | Modal «Reportar um problema» abre | |
| 2 | Confirmar consentimentos LGPD visíveis; preencher descrição opcional | Checkbox «contexto técnico» default on; descrição aceita texto | |
| 3 | Enviar | Toast «Relatório enviado»; `POST /support/reports` 201; modal fecha | |
| 4 | (Ops) Verificar em console `:3013` ou API | Report listado sem PHI indevido no bundle | |
