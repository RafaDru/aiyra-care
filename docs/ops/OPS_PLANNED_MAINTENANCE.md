# Ops — manutenção planejada (suppress auto-INC)

**Status:** v1 env + bridge gate + CH banner read-only (**implementado**); v2 suppress auto-INC ops_alert dispatch (**implementado**)  
**Épico roadmap:** `ops-planned-maintenance`  
**Gap / prioridade:** [`CH_OPS_GAP_AND_PRIORITY.md`](./CH_OPS_GAP_AND_PRIORITY.md)

---

## Objetivo

Durante deploy, migração ou janela de manutenção, **não** abrir incidentes automáticos a partir de telemetria (`client_errors` bridge) nem do hook de **5xx** na API — evitando ruído na fila INC. **Ingest** de `client_errors` e `product_events` **continua**.

Chamados **Reportar problema** e alertas ops configurados permanecem permitidos (recomendação Rafael 2026-10-06), com banner de manutenção na UI quando existir.

---

## Superfícies v1 vs v2

| Superfície | v1 (recomendado) | v2 (opcional) |
|------------|------------------|---------------|
| **Ativação** | Env `OPS_PLANNED_MAINTENANCE=1` no processo API (+ preview tier separado) | Toggle CH (persistido) + env override |
| **CH UI** | Banner read-only «Manutenção planejada» se API expõe flag (GET health/degraded ou `/ops/runtime-flags`) | Toggle admin com audit |
| **Persistência** | Env-only | Tabela `ops_runtime_flags` (`key`, `value`, `updated_at`, `updated_by`) |

**Recomendação:** ship **env v1** + banner read-only alimentado por leitura da mesma env no ops-console (proxy API) antes de DDL.

---

## Comportamento

### Com `OPS_PLANNED_MAINTENANCE=1`

| Fonte | Ingest / log | Auto-INC |
|-------|--------------|----------|
| `POST /telemetry/client-errors` | Sim (`client_errors`) | **Não** (bridge skip) |
| API unhandled **5xx** (prefixos bridge) | Sim (`app.log.error`) | **Não** |
| `POST /support/reports` | Sim | **Sim** (dispatch normal) |
| Ops alerts → fila (métricas / webhook Slack) | Sim | Webhook opcional; **auto-INC** (`enqueueOpsAlert` + dispatch) **não** |
| Incident dispatch worker | — | Não altera INC já abertos |

### Código

- `packages/api/src/domain/ops/ops-planned-maintenance.ts` — `isOpsPlannedMaintenanceActive()`, `shouldSuppressAutoIncDuringPlannedMaintenance(trigger)`
- `ClientErrorIncidentBridgeService.onIngestedErrors` / `handleServerError` — early return (v1)
- **v2 ops_alert auto-INC:** `shouldAutoInvestigateOpsAlert`, `investigateOpsAlertWithQueue`, `IncidentDispatchService.dispatchOpsAlertTriage`, `dispatchOpsAlertInvestigator` — skip quando `trigger === 'auto'`; triagem **manual** e `POST /support/reports` inalterados

### Saúde / modo degradado

- **Não** confundir com `runtime_degraded_state` (sync/Ava/portal).
- Opcional futuro: `GET /health` inclui `plannedMaintenance: true` para o CH banner (sem mudar HTTP status).

---

## Env

| Variável | Default | Efeito |
|----------|---------|--------|
| `OPS_PLANNED_MAINTENANCE` | `0` | `1` / `true` / `yes` → suppress bridge + 5xx INC + auto ops_alert INC/dispatch |

Template: `.env.example` (seção ops bridge).

Independente de `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED` — bridge pode estar `1` mas manutenção bloqueia enqueue.

---

## Rollout operacional

1. Antes do deploy: set `OPS_PLANNED_MAINTENANCE=1` na API (e preview se aplicável).
2. Executar migração / restart.
3. Validar: ingest client error **sem** novo `INC-*` (suite QA).
4. Limpar flag; smoke `client-error-ch-bridge` se bridge piloto ativo.

---

## Critérios de aceite

- [x] Com manutenção ativa, fingerprint allowlisted **não** cria `ops_analysis_queue` via bridge.
- [x] Com manutenção ativa, 5xx em `/auth/*` **não** cria INC sintético.
- [x] Com manutenção ativa, auto ops_alert **não** enfileira INC nem dispara triagem automática.
- [x] Com manutenção inativa, comportamento bridge e ops_alert inalterado (vitest).
- [ ] `POST /support/reports` ainda cria INC (teste manual ou e2e existente).
- [ ] Documentação cross-link bridge + gap doc.

---

## QA

- Suite stub: [`docs/testing/suites/ops-planned-maintenance.md`](../testing/suites/ops-planned-maintenance.md)
- Automação: `packages/api/tests/ops-planned-maintenance.test.ts`, `ops-planned-maintenance-ops-alert.test.ts`, `client-error-incident-bridge.service.test.ts`
- Comando: `cd packages/api && npx vitest run tests/ops-planned-maintenance.test.ts tests/ops-planned-maintenance-ops-alert.test.ts tests/client-error-incident-bridge.service.test.ts`

---

## Relacionados

- [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md)
- [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md)
