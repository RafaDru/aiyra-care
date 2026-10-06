# Suite — `client-error-ch-bridge`

| Campo | Valor |
|-------|--------|
| **ID** | `client-error-ch-bridge` |
| **Feature** | Telemetria / CH pipeline |
| **Lane** | `ops` |
| **Fixture** | `core-demo` |
| **parallelSafe** | `true` |
| **Automação** | `done` (vitest) |

## Pré-requisitos

- [ ] Migration **078** aplicada (`node packages/api/scripts/apply-migration-078.mjs`)
- [ ] API com `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED=1`
- [ ] `CLIENT_ERROR_INCIDENT_DEDUPE_MS=900000`, `CLIENT_ERROR_INCIDENT_MIN_COUNT=1`
- [ ] `CLIENT_ERROR_INCIDENT_FEATURES` inclui feature do teste (ex. `account_settings`)

## Passos (manual + PG)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | `POST /telemetry/client-errors` com fingerprint válido (`account_settings`, `api`, `HTTP_503`) | `202` accepted≥1 | |
| 2 | Consultar `ops_analysis_queue` ou CH `:3013` Incidentes | Novo item título `Client error · account_settings · HTTP_503`, `source_id` `client_error:{fp}` | |
| 3 | Repetir mesmo fingerprint em &lt;15 min | Sem segundo INC (dedupe `client_error_incident_signals`) | |
| 4 | (Opcional) Forçar 5xx em rota `/auth/*` com bridge on | INC sintético `HTTP_500` | |

## Automação

```bash
cd packages/api && npx vitest run tests/client-error-incident-bridge.config.test.ts tests/client-error-incident-bridge.service.test.ts tests/client-error-incident-signal.repository.test.ts tests/ops-planned-maintenance.test.ts
```

## Referência

- [`docs/ops/CLIENT_ERROR_INCIDENT_BRIDGE.md`](../../ops/CLIENT_ERROR_INCIDENT_BRIDGE.md)
