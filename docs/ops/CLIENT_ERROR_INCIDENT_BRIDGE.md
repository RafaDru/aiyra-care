# Client errors → Command Hub incidents (bridge)

**Status:** pilot (tier 0) · migration **078**

When enabled, qualifying `client_errors` fingerprints and unhandled **5xx** on critical API prefixes open an `INC-*` row in `ops_analysis_queue` and the standard incident dispatch outbox — **without** client stack traces or PHI in PG/webhook payloads.

## Enable

| Variable | Default | Meaning |
|----------|---------|---------|
| `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED` | `0` | `1` turns bridge on |
| `CLIENT_ERROR_INCIDENT_FEATURES` | `account_settings,dashboard,ui` | Feature allowlist (pilot) |
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
CLIENT_ERROR_INCIDENT_FEATURES=account_settings,dashboard,ui
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

## Related

- [`TELEMETRY.md`](./TELEMETRY.md) · [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md)
- QA suite: `docs/testing/suites/client-error-ch-bridge.md`
