# CH — autenticação de operador

| Campo | Valor |
|-------|--------|
| **ID** | `ch-operator-auth` |
| **Épico** | Command Hub / `prod-run-intelligence` |
| **Status** | `done` |
| **Categoria** | técnico |
| **Prioridade** | P1 |

## Resumo

Login Supabase + allowlist de e-mails no ops-console `:3013`, protegendo UI e APIs do Command Hub antes de exposição via túnel ou preview público. Callbacks de automação e webhooks GitHub permanecem com autenticação M2M existente.

## Comportamento (operador)

1. Abre CH → tela de login se auth ativa.
2. Magic link ou Google (mesmo projeto Supabase do app).
3. E-mail deve constar em `OPS_CONSOLE_OPERATOR_EMAILS`.
4. UI e `/api/*` passam a aceitar só Bearer JWT válido + allowlist.

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Spec | `docs/ops/CH_OPERATOR_AUTH.md` |
| Servidor | `packages/ops-console/src/operator-auth*.ts`, `server.ts` |
| Client | `ChOperatorLogin.tsx`, `ChOperatorAuthContext.tsx` |
| Health | `operatorAuthEnabled` em `GET /health` |

## Fora de escopo (v1)

- Cloudflare Access / service tokens no túnel.
- Auth em `operator-approve-pr` via investigator key (spec futura).
- Menu B2C para CH (permanece link interno / `openOpsConsole`).

## QA

| Campo | Valor |
|-------|--------|
| **Suite** | Regressão CH existente + vitest dedicado |
| **Comando** | `cd packages/api && npx vitest run tests/ops-console-operator-auth.test.ts` |
| **Regressão** | `npm run test:ops` |

Critérios: exempt paths; allowlist; default tier; E2E mocks `/api/auth/status` com `enabled: false`.

## Relacionado

- [`CH_ACCESS.md`](../ops/CH_ACCESS.md) · [`CH_OPS_CALLBACK_TUNNEL_SPEC.md`](../ops/CH_OPS_CALLBACK_TUNNEL_SPEC.md)