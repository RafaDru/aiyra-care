# Investigação — infra_api_down

| Campo | Valor |
|-------|--------|
| **Severidade** | critical |
| **Categoria** | infra |
| **Mensagem** | API health falhou (no response) |
| **Tier** | 0 (rascunho automático — Suporte SRE) |
| **Playbook** | `ops-alert-tier0` |
| **Gatilho** | manual (botão **Analisar** no console) |
| **Investigation ID** | `2d6ee19d-5020-42bc-92a3-29263730fc7b` |
| **Ambiente** | `integration` |
| **API sondada** | `http://127.0.0.1:3010` (`environment.apiPublicUrl`) |
| **Notas ops** | Teste com cenário real |

## Resumo

A sonda ops (`runOpsProbe` → `GET /health` em `API_PUBLIC_URL`) registrou falha imediata (`latencyMs: 2`, `error: fetch failed`), típica de **nada escutando na porta 3010** (connection refused), não de timeout ou HTTP 5xx. O endpoint `/health` da API **não depende de Postgres** — indisponibilidade aqui aponta para processo API parado ou stack integration não levantada.

## Hipóteses (prioridade)

1. **Cenário de teste intencional (mais provável)** — `operatorNotes` indicam exercício de alerta real; operador pode ter derrubado a API ou não executou `scripts/up.ps1` / `npm run dev` na API após o teste.
2. **Processo API ausente ou crash no host integration** — `fetch failed` em ~2 ms alinha com porta fechada; verificar `api.log` na raiz do monorepo e reiniciar via `scripts/up.ps1` (Windows) ou `cd packages/api && npm run dev`.
3. **URL/porta divergente** — sonda usa `API_PUBLIC_URL` (default `http://127.0.0.1:3010`); preview usa `:3020`. Menos provável neste payload (`apiPublicUrl` = 3010).
4. **Postgres down** — geraria `infra_postgres_down` na mesma sonda, não explica sozinho `infra_api_down` (health HTTP nem chega a responder).

## Evidências

### Payload do webhook (sem PHI)

- `alertId`: `infra_api_down`
- `details`: `{ "latencyMs": 2, "error": "fetch failed", "checkedAt": "2026-10-13T15:22:52.450Z" }`
- `triage`: `humanRequired: true`, `tier: infra`, `reason: critical — requer operador`

### Mapeamento código → probe

- Avaliação do alerta: `packages/api/src/domain/ops/ops-alerts.ts` — `!probe.api.ok` → `infra_api_down`, mensagem com status ou `no response`.
- Sonda: `packages/api/src/application/ops/ops-probe.service.ts` — `probeHttp('/health')` contra `(process.env.API_PUBLIC_URL ?? http://127.0.0.1:3010)`.
- Threshold slow (não aplicável): `OPS_PROBE_API_SLOW_MS` (default 3000 ms) → `infra_api_slow`.

### Fallback automático (se sonda persistida)

- `isOpsProbeDegraded` + `buildRuntimeStateFromOps` podem ativar **leitura degradada D-1** (`degraded_read`, reason `infra_probe`) — ver `docs/OPS_FALLBACKS_AND_ALERTS.md` e `runtime-degraded.service.ts`.

### Verificação neste ambiente de agente (não é o host integration)

- `curl http://127.0.0.1:3010/health` → connection refused (VM do agente sem stack local).
- Sem listeners em `3010` / `3020` / `5432` nesta VM; `api.log` ausente no workspace.

## Próximo passo humano (integration)

1. Abrir [console ops](https://faqs-solving-ontario-four.trycloudflare.com?tab=incidentes&investigationId=2d6ee19d-5020-42bc-92a3-29263730fc7b&alertId=infra_api_down) → aba **Infra** → confirmar probe API.
2. No **host integration** onde a sonda roda: `curl -sS http://127.0.0.1:3010/health` — esperado JSON `status: ok`.
3. Se falhar: reiniciar stack (`scripts/up.ps1` ou API `packages/api && npm run dev`); inspecionar `api.log` por crash/OOM/porta em uso.
4. Reexecutar `npm run ops:triage` ou **Verificar e acionar**; confirmar alerta limpo.
5. Se era só teste: marcar incidente **Concluir** no CH com referência a este artefato.

## Console

https://faqs-solving-ontario-four.trycloudflare.com?tab=incidentes&investigationId=2d6ee19d-5020-42bc-92a3-29263730fc7b&alertId=infra_api_down

## Callback do agente

- `analysisQueue.callbackUrl`: `https://faqs-solving-ontario-four.trycloudflare.com/api/analysis-queue/callback`
- **Auth:** o payload do webhook **não** incluiu `callbackAuth` nem segredo em `analysisQueue`. O agente na nuvem não tem `OPS_INVESTIGATOR_CALLBACK_KEY` / `OPS_METRICS_KEY` local.
- **Resultado (2026-10-13):** `POST triage-started` e `POST callback` retornaram **HTTP 401** `{"error":"unauthorized"}`.
- **Ação ops:** incluir `callbackAuth` no dispatch (`resolveInvestigatorCallbackAuth`, como em defect-fix) **ou** concluir manualmente no CH com artefato `docs/ops/investigations/2026-10-13-infra_api_down.md`.
