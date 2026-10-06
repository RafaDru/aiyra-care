# Suite — `ops-planned-maintenance`

| Campo | Valor |
|-------|--------|
| **ID** | `ops-planned-maintenance` |
| **Domínio** | ops |
| **Lane** | `ops` |
| **Spec** | [`docs/ops/OPS_PLANNED_MAINTENANCE.md`](../../ops/OPS_PLANNED_MAINTENANCE.md) |

## Pré-requisitos

- [ ] API com `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED=1` (piloto)
- [ ] `OPS_PLANNED_MAINTENANCE=1` no processo API

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | `POST /telemetry/client-errors` fingerprint allowlisted | `202` accepted; **sem** novo INC na fila |
| 2 | Forçar 5xx em rota `/auth/*` (test harness ou vitest) | Log server; **sem** INC bridge |
| 3 | `OPS_PLANNED_MAINTENANCE=0` + repetir passo 1 | INC criado (se dedupe ok) |
| 4 | `POST /support/reports` com manutenção `1` | INC de suporte **criado** (humano) |
| 5 | Loop ops alerts com infra critical + `OPS_PLANNED_MAINTENANCE=1` | INC auto **criado** com tag CH «Em manutenção» (`plannedMaintenanceActive`) |

## Automação

```bash
cd packages/api && npx vitest run tests/ops-planned-maintenance.test.ts tests/ops-planned-maintenance-ops-alert.test.ts tests/client-error-incident-bridge.service.test.ts
```

## Relacionados

- [`client-error-ch-bridge`](./client-error-ch-bridge.md)
- [`support-user-report`](./support-user-report.md)
