# Suite — `ops-health`

| Campo | Valor |
|-------|--------|
| **ID** | `ops-health` |
| **Feature** | ops / observabilidade |
| **Lane** | `ops` |
| **Fixture** | `ops-local` |
| **parallelSafe** | `true` |
| **Automação** | `partial` → `npm run ops:smoke` |

## Pré-requisitos

- [ ] API dev `:3010` up
- [ ] `OPS_METRICS_KEY` em `.env` (ou `npm run setup:ops-prod`)
- [ ] Opcional: console `:3013`, notifier `:3012` para `OPS_SMOKE_FULL=1`

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | `curl http://127.0.0.1:3010/health` | 200 | |
| 2 | `GET /ops/metrics` com header `x-internal-ops-key` | 200 JSON | |
| 3 | `GET /ops/metrics` sem key | 401 ou 403 | |
| 4 | `npm run ops:smoke` | Todos checks OK | |
| 5 | (Opcional) `OPS_SMOKE_FULL=1 npm run ops:smoke` | Console + notifier OK | |

## Notas

- CI usa `OPS_SMOKE_SKIP_HTTP=1` — passos HTTP são manuais ou em gate local completo
