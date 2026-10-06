# Ops — manutenção planejada (suppress auto-INC)

**Status:** v1 bridge/5xx + CH banner + tag ops_alert (**7A**, Rafael 2026-10-06)  
**Épico roadmap:** `ops-planned-maintenance`  
**Gap / prioridade:** [`CH_OPS_GAP_AND_PRIORITY.md`](./CH_OPS_GAP_AND_PRIORITY.md)

---

## Objetivo

Durante deploy, migração ou janela de manutenção, **não** abrir incidentes automáticos a partir de telemetria (`client_errors` bridge) nem do hook de **5xx** na API — evitando ruído na fila INC. **Ingest** de `client_errors` e `product_events` **continua**.

**Ops alerts** e **Reportar problema** **continuam** abrindo INC (decisão **7A**): o operador vê a tag **«Em manutenção»** no CH (`contextSnapshot.plannedMaintenanceActive`) para descartar ou priorizar com consciência.

---

## Superfícies v1 vs v2

| Superfície | v1 (recomendado) | v2 (opcional) |
|------------|------------------|---------------|
| **Ativação** | Env `OPS_PLANNED_MAINTENANCE=1` no processo API (+ preview tier separado) | Toggle CH (persistido) + env override |
| **CH UI** | Banner read-only «Manutenção planejada» + tag INC «Em manutenção» quando INC nasce na janela | Toggle admin com audit |
| **Persistência** | Env-only | Tabela `ops_runtime_flags` (`key`, `value`, `updated_at`, `updated_by`) |

**Recomendação:** ship **env v1** + banner read-only alimentado por leitura da mesma env no ops-console (proxy API) antes de DDL.

### v2 roadmap (stub — não implementado)

| Item | Objetivo | Notas |
|------|----------|--------|
| **`ops_runtime_flags` DDL** | Persistir `planned_maintenance` + audit (`updated_by`, `updated_at`) | Substitui env-only; API `:3010` fonte de verdade |
| **CH toggle admin** | Ligar/desligar manutenção com confirmação + audit trail | Read-only v1 banner permanece fallback se flag ausente |
| **`GET /ops/runtime-flags`** | Expor `{ plannedMaintenance, sources[] }` para CH + connect-worker | Unificar leitura com `isOpsPlannedMaintenanceActive()` |
| **Worker reconcile** | connect-worker lê flag PG a cada tick scheduled sync / alertas | Evita drift API vs notebook env |

**Nota:** suppress v2 de `ops_alert` (#118) foi **revertido** — política canônica é **7A+tag** ([`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) §8.7).

**Prioridade v2:** após `ch-cycle-close` C9 e política ingress prod. Épico roadmap: `ops-planned-maintenance` fatia v2.

---

## Comportamento

### Com `OPS_PLANNED_MAINTENANCE=1`

| Fonte | Ingest / log | Auto-INC |
|-------|--------------|----------|
| `POST /telemetry/client-errors` | Sim (`client_errors`) | **Não** (bridge skip) |
| API unhandled **5xx** (prefixos bridge) | Sim (`app.log.error`) | **Não** |
| `POST /support/reports` | Sim | **Sim** (dispatch normal) |
| Ops alerts → fila (métricas / webhook Slack) | Sim | **Sim** — `enqueueOpsAlert` + dispatch; tag `plannedMaintenanceActive: true` no `contextSnapshot` |
| Incident dispatch worker | — | Não altera INC já abertos |

### Código

- `packages/api/src/domain/ops/ops-planned-maintenance.ts` — `isOpsPlannedMaintenanceActive()`, `shouldSuppressAutoIncDuringPlannedMaintenance(trigger)` (**só** bridge + 5xx)
- `ClientErrorIncidentBridgeService.onIngestedErrors` / `handleServerError` — early return
- `OpsAnalysisQueueService.enqueueOpsAlert` — `plannedMaintenanceActive: true` quando manutenção ativa no enqueue
- CH: `incidentPlannedMaintenanceActive()` · tag «Em manutenção» em `IncidentesPanel` + `ChIncidentDetailBody`

### Saúde / modo degradado

- **Não** confundir com `runtime_degraded_state` (sync/Ava/portal).
- `GET /health` inclui `plannedMaintenance: true` para o CH banner (sem mudar HTTP status).

---

## Env

| Variável | Default | Efeito |
|----------|---------|--------|
| `OPS_PLANNED_MAINTENANCE` | `0` | `1` / `true` / `yes` → suppress bridge + 5xx INC; ops_alert INC **com tag** |

Template: `.env.example` (seção ops bridge).

Independente de `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED` — bridge pode estar `1` mas manutenção bloqueia enqueue.

---

## Rollout operacional

1. Antes do deploy: set `OPS_PLANNED_MAINTENANCE=1` na API (e preview se aplicável).
2. Executar migração / restart.
3. Validar: ingest client error **sem** novo `INC-*` via bridge (suite QA).
4. Ops alerts críticos durante janela: INC **pode** aparecer com tag «Em manutenção» — descartar se falso positivo de deploy.
5. Limpar flag; smoke `client-error-ch-bridge` se bridge piloto ativo.

---

## Critérios de aceite

- [x] Com manutenção ativa, fingerprint allowlisted **não** cria `ops_analysis_queue` via bridge.
- [x] Com manutenção ativa, 5xx em `/auth/*` **não** cria INC sintético.
- [x] Com manutenção ativa, auto ops_alert **enfileira** INC com `plannedMaintenanceActive: true` (não suppress #118).
- [x] CH lista/detalhe INC mostra tag «Em manutenção» quando tag presente.
- [x] Com manutenção inativa, comportamento bridge e ops_alert inalterado (vitest).
- [ ] `POST /support/reports` ainda cria INC (teste manual ou e2e existente).
- [x] Documentação cross-link bridge + gap doc + ingress §8.7.

---

## QA

- Suite: [`docs/testing/suites/ops-planned-maintenance.md`](../testing/suites/ops-planned-maintenance.md)
- Automação: `packages/api/tests/ops-planned-maintenance.test.ts`, `ops-planned-maintenance-ops-alert.test.ts`, `client-error-incident-bridge.service.test.ts`
- Comando: `cd packages/api && npx vitest run tests/ops-planned-maintenance.test.ts tests/ops-planned-maintenance-ops-alert.test.ts tests/client-error-incident-bridge.service.test.ts`

---

## Relacionados

- [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md)
- [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) §8.7
- [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md)
