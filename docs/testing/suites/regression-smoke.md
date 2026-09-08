# Suite — `regression-smoke`

| Campo | Valor |
|-------|--------|
| **ID** | `regression-smoke` |
| **Feature** | núcleo (público) |
| **Lane** | `regression` |
| **Fixture** | `core-demo` (não exige login) |
| **parallelSafe** | `false` |
| **Automação** | `partial` → `packages/web/e2e/smoke.spec.ts` |

## Pré-requisitos

- [ ] Web acessível (`http://localhost:5173` ou preview `:5174`)
- [ ] API opcional para este smoke (páginas públicas)

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir `/login` | Página renderiza; texto Entrar/Login/Aiyra visível | |
| 2 | Abrir `/home` | Landing visível; sem erro 5xx no console | |
| 3 | Abrir `/roadmap` (se auth não exigida) ou após login | Roadmap ou redirect coerente | |

## Notas

- CI já executa passos 1–2 via Playwright em `vite preview :4173`.
- Para regressão manual em dev, usar URL real `:5173`.
