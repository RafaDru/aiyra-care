# Investigação — sim_infra_api_down_mu2qw4hz

- **Severidade:** critical
- **Categoria:** infra
- **Mensagem:** API health check failed (smoke test)
- **Tier:** 0 (rascunho automático)
- **Gatilho:** manual
- **Ambiente:** `integration` · API base `http://127.0.0.1:3010`
- **Notas ops:** Alerta de smoke (`details.source: ops-alert-investigator-smoke`). `triage.humanRequired: true`, `triage.reason: smoke`. Sem `operatorNotes` no payload.

## Hipóteses

1. **Stack de integração parada (principal)** — Nenhum processo escutando em `:3010` (API) nem `:5432` (Postgres). Sonda `ops:probe` confirma `fetch failed` na API e `ECONNREFUSED` no PG. Consistente com ambiente sem `scripts/up.ps1` / serviços dev ativos.
2. **Cascata PG → API** — Mesmo que a API fosse iniciada sem Postgres, health e probes falhariam; o runbook trata `infra_postgres_down` como causa raiz separada quando PG cai com API ok.
3. **Falso positivo de smoke** — Payload simulado por `scripts/ops-alert-investigator-simulate.mjs` dispara webhook sem garantir stack up; o alerta reflete estado real do host no momento da sonda, não necessariamente incidente de produção.

## Evidências no repo

| Verificação | Resultado |
|-------------|-----------|
| `curl http://127.0.0.1:3010/health` | Conexão recusada (HTTP 000) |
| `curl http://127.0.0.1:3013/` | Conexão recusada (console ops down) |
| `pg_isready -h 127.0.0.1 -p 5432` | Não pronto |
| `npm run ops:probe` | `api.ok: false` (`fetch failed`), `postgres.ok: false` (`ECONNREFUSED 127.0.0.1:5432`), `degraded: true` |
| Artefato | `packages/api/scripts/output/ops-probe-last.json` — `checkedAt: 2026-09-15T14:07:25.500Z` |
| `api.log` | Ausente (processo API não iniciado neste host) |
| Mapeamento alerta | Família `infra_api_down` em `packages/api/src/domain/ops/ops-alerts.ts` → probe `GET /health` via `ops-probe.service.ts` |
| Runbook | `docs/ops/RUNBOOK_ALERTS.md` § Infra — API: reiniciar via `scripts/up.ps1`, checar PG, logs `api.log` |

### Payload webhook (metadados)

```json
{
  "alertId": "sim_infra_api_down_mu2qw4hz",
  "severity": "critical",
  "category": "infra",
  "environment": { "deploymentTier": "integration", "apiPublicUrl": "http://127.0.0.1:3010" },
  "investigation": { "tier": 0, "playbook": "ops-alert-tier0", "trigger": "manual" }
}
```

`analysisQueue` **não** presente no payload — callback de conclusão indisponível nesta execução (ver limitação abaixo).

## Próximo passo humano

1. No host de **integração** (Windows dev local): executar `scripts/up.ps1` ou `npm run ops:console` + reiniciar API (`cd packages/api && npm run dev`).
2. Confirmar Postgres: `pg_isready` ou serviço PG local (`postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare`).
3. Revalidar: `curl http://127.0.0.1:3010/health` → 200; `npm run ops:probe` → `degraded: false`.
4. Console ops → **Verificar e acionar** ou marcar análise concluída com este artefato.
5. Se PG ok mas API continua down → logs `api.log`, porta `PORT`, variáveis `.env` (`DATABASE_URL`, `CRYPTO_KEY`).

**Fallback automático:** `runtime_degraded` / banner D-1 pode ativar se snapshot existir (`docs/OPS_FALLBACKS_AND_ALERTS.md`).

## Console

http://127.0.0.1:3013

## Remediação (resumo agente)

Stack integration offline: API e Postgres inacessíveis na sonda. Ação recomendada — subir stack local (`up.ps1`) e reexecutar probe antes de escalar. Tier 0: sem alteração de código.
