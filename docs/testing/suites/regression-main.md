# Suite — Regressão e teste completo

| Lane | Comando | Quando |
|------|---------|--------|
| **`regression`** | `npm run qa:run-all -- --lane regression` | Push `main` — smoke + paciente CRUD |
| **`business-full`** | `npm run qa:run-all -- --lane business-full` | Preview / release — **todo CRUD de negócio via UI** |
| **`ava`** | `npm run qa:run-all -- --lane ava` | Validar companion (sem qualidade LLM) |

Matriz completa: [`BUSINESS_ACTION_MATRIX.md`](../BUSINESS_ACTION_MATRIX.md).

## `regression` (sequencial)

1. `regression-smoke`
2. `core-patient-crud`

## `business-full` (paralelo por domínio)

Ver `suites/index.json` → lane `business-full`. Inclui exames, documentos, medicamentos, integrações UI, família, Ava, suporte.

**Não inclui** portais WAF (`integration-portal`) — rodar à parte se necessário.
