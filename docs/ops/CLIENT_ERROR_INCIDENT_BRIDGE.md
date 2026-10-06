# Client errors → Command Hub incidents (bridge)

**Status:** pilot (tier 0) · migration **078**

When enabled, qualifying `client_errors` fingerprints and unhandled **5xx** on critical API prefixes open an `INC-*` row in `ops_analysis_queue` and the standard incident dispatch outbox — **without** client stack traces or PHI in PG/webhook payloads.

## Enable

| Variable | Default | Meaning |
|----------|---------|---------|
| `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED` | `0` | `1` turns bridge on |
| `CLIENT_ERROR_INCIDENT_FEATURES` | phase 0+1 defaults (see § Universal) | Feature allowlist |
| `CLIENT_ERROR_INCIDENT_DEDUPE_MS` | `900000` (15 min) | Max one auto-incident per fingerprint × deployment tier (piloto/teste; aumente em prod) |
| `CLIENT_ERROR_INCIDENT_MIN_COUNT` | `1` | Ocorrências mínimas para abrir INC (piloto: **1** = cada fingerprint qualificada) |
| `CLIENT_ERROR_INCIDENT_API_PREFIXES` | `/auth,/account,/patients` | Server 5xx hook paths |
| `CLIENT_ERROR_INCIDENT_SRE_FEATURES` | *(empty)* | Features routed to `sre_support` lane |

Apply migration:

```bash
node packages/api/scripts/apply-migration-078.mjs
```

**Piloto Rafael (teste):** na raiz do monorepo `.env` ou variáveis do processo API:

```env
CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED=1
CLIENT_ERROR_INCIDENT_FEATURES=account_settings,dashboard,ui,patient_exams,patient_integrations,patient_wallet,patient_detail,integrations,family_hub
CLIENT_ERROR_INCIDENT_DEDUPE_MS=900000
CLIENT_ERROR_INCIDENT_MIN_COUNT=1
```

Template comentado: `packages/api/.env.example` (fragmento bridge). Espelho desejado na raiz: `.env.example` § ops (mesmos defaults).

## Flow

1. Web/mobile `POST /telemetry/client-errors` → `client_errors` (unchanged).
2. After successful insert, bridge evaluates allowlist + dedupe table `client_error_incident_signals`.
3. Enqueue `ops_analysis_queue` with `source_id = client_error:{fingerprint}`, lane `development_support` (unless SRE feature map).
4. `IncidentDispatchService.ensureOutboxForQueueRecord` — same CH pipeline as support/ops alerts ([`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md)).
5. Unhandled API **5xx** on allowlisted prefixes: stack logged **server-only** (`app.log.error`); synthetic `error_kind=api`, `error_code=HTTP_5xx`.

Human triage → defeito unchanged. Dedupe does not block manual support reports.

## Ops checklist

- Confirm bridge env on API (and preview tier separately).
- CH **Incidentes**: title `Client error · {feature} · {code}`; context has fingerprint, route, `api_path` only.
- Disable pilot: set `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED=0` — ingest continues, no new auto-INC.

## Planned maintenance gate

When `OPS_PLANNED_MAINTENANCE=1`, the bridge **does not** enqueue INC (client ingest and server 5xx logging unchanged). Human support reports are unaffected. See [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md).

---

## Universal failure ingress (Rafael 2026-10-06)

**Épico:** `client-error-universal-ingress` · gap: [`CH_OPS_GAP_AND_PRIORITY.md`](./CH_OPS_GAP_AND_PRIORITY.md)

### Target feature map (rollout)

| Fase | Superfície | Feature keys / paths | Lane default |
|------|------------|----------------------|--------------|
| **0 (atual)** | Web account/settings, dashboard shell, generic UI | `account_settings`, `dashboard`, `ui` | `development_support` |
| **1** | Web patient tabs (exams, integrations, wallet) | `patient_exams`, `patient_integrations`, `patient_wallet` | dev |
| **2** | Mobile shell | same keys as web parity · `packages/mobile/src/lib/client-errors.ts` | dev |
| **3** | API integration sync | `integration_links` · 5xx prefixes `/integration-links` | `sre_support` if `CLIENT_ERROR_INCIDENT_SRE_FEATURES` |
| **4** | Ava / LLM boundary | `ava_companion` — **cautela** médica; dedupe longo | dev + review triagem |

### Rollout phases

1. **Doc + env** — expand `CLIENT_ERROR_INCIDENT_FEATURES` por ambiente (preview ≠ prod).
2. **MIN_COUNT** — implementar janela real no service (hoje config existe, enqueue ignora contagem).
3. **Noise policy** — subir `CLIENT_ERROR_INCIDENT_DEDUPE_MS` em prod (ex. 6h); manter 15m notebook.
4. **Maintenance** — sempre respeitar `OPS_PLANNED_MAINTENANCE` antes de abrir INC.

### Dedupe / noise

- Chave dedupe: `fingerprint × deployment_tier` em `client_error_incident_signals`.
- `CLIENT_ERROR_INCIDENT_MIN_COUNT` > 1 em prod recomendado após fase 1.
- Bridge **não** bloqueia `POST /support/reports` nem dedupe de defeito pós-triagem.

### Notebook vs prod allowlist (default recommendation)

| Ambiente | `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED` | Features | `MIN_COUNT` | `DEDUPE_MS` |
|----------|----------------------------------------|----------|-------------|-------------|
| **Notebook / integração** | `1` para piloto | phase 0+1 defaults (patient tabs + integrations) | `1` | `900000` (15m) |
| **Preview** | `0` até validar suite | igual notebook quando `1` | `1` | `900000` |
| **Prod (futuro)** | `1` após fase 2+ | mapa fase 1–3 | `3–5` | `21600000` (6h) |

During maintenance windows: `OPS_PLANNED_MAINTENANCE=1` regardless of bridge enabled.

---

## Related

- [`TELEMETRY.md`](./TELEMETRY.md) · [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) · [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md)
- QA suite: `docs/testing/suites/client-error-ch-bridge.md`
