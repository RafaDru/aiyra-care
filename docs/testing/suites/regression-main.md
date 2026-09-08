# Suite — Regressão `main` (agregado)

| Campo | Valor |
|-------|--------|
| **ID** | `regression-main` (meta — não é suite isolada) |
| **Lane** | `regression` |
| **Comando** | `npm run qa:run-all -- --lane regression` |

## Ordem de execução (sequencial)

| Ordem | Suite | Obrigatória |
|-------|-------|-------------|
| 1 | [`regression-smoke`](./regression-smoke.md) | Sim |
| 2 | [`core-auth-dashboard`](./core-auth-dashboard.md) | Sim |
| 3 | [`family-access-matrix`](./family-access-matrix.md) | Sim *(BLOCKED até seed)* |

## Quando rodar

- Antes de **todo** `git push origin main`
- Após mudanças em dashboard, auth, família, ou migrations 057–063

## Paralelo

**Não** paralelizar dentro desta lane. Para testar features em paralelo, use suites individuais com `parallelSafe: true` — ver [`PARALLEL_QA_MODEL.md`](../PARALLEL_QA_MODEL.md).

## Automação futura

CI job `e2e-regression` executará as mesmas suites — ver [`AUTOMATION_ROADMAP.md`](../AUTOMATION_ROADMAP.md).
