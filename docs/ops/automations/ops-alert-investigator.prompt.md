# Playbook — Suporte SRE (Tier 0)

**Instructions para colar no Cursor Automations:** use o arquivo canônico na raiz de `docs/`:

→ **[automations-aiyra-triador-sre-instructions.md](../../automations-aiyra-triador-sre-instructions.md)**

(Caminho no repo: `docs/automations-aiyra-triador-sre-instructions.md` — bloco entre `=== INÍCIO ===` e `=== FIM ===`.)

Este `.prompt.md` permanece como referência para workflows em `.cursor/automations/`.

**Proibido:** credenciais, `DATABASE_URL`, dados de paciente, conteúdo de logs com PHI.

## Objetivo (Tier 0)

Rascunho de investigação para triagem humana — **não** abrir PR nem alterar produção.

## Passos por família

### `category: infra`

1. Ler `docs/OPS_FALLBACKS_AND_ALERTS.md` e `docs/ops/RUNBOOK_ALERTS.md`.
2. Mapear `alertId` → probe (`ops-probe.service.ts`), `runtime_degraded`, scripts `up.ps1` / `ops-console-up.ps1`.
3. Para `infra_api_down` / `infra_postgres_down`: checar health checks, portas `:3010`/`:3020`, logs `api.log`.
4. Para `infra_*_slow`: thresholds `OPS_PROBE_*_SLOW_MS`.

### `category: sync`

1. `docs/SYNC_DELTA.md`, `sync_jobs`, portal em `details`.
2. Jobs presos → `IntegrationLinkSyncService`, worker `connect-worker`.

### `category: llm`

1. `docs/LLM_USAGE.md`, `runtime_degraded` Ava lite, `llm_usage_events`.

### `category: product`

1. `docs/ops/TELEMETRY.md`, feature allowlist, `client_errors`.

## Saída obrigatória

`docs/ops/investigations/YYYY-MM-DD-<alertId>.md`

```markdown
# Investigação — <alertId>

- **Severidade:** …
- **Categoria:** …
- **Mensagem:** …
- **Tier:** 0 (rascunho automático)
- **Gatilho:** auto | manual
- **Notas ops:** …

## Hipóteses
1. …

## Evidências no repo
- …

## Próximo passo humano
- …

## Console
<dashboardUrl>
```

## Início da triagem (Automation HTTP — não LLM)

Antes do agente, a Automation deve executar **passo 0**: `POST` em `analysisQueue.triageStartedUrl` com o mesmo header de auth do callback. Isso marca o incidente **Em triagem** no CH sem consumir tokens do modelo.

## Callback (obrigatório ao finalizar)

`POST` em `analysisQueue.callbackUrl` com header `x-investigator-callback-key` ou `x-internal-ops-key`.

```json
{
  "investigationId": "<investigationId>",
  "remediationSummary": "Resumo: hipótese + evidências + próximo passo",
  "analysisArtifactPath": "docs/ops/investigations/YYYY-MM-DD-<8chars>-<alertId>.md"
}
```

Correlação: `docs/ops/INVESTIGATION_CORRELATION.md` — cite `investigationId` no topo do markdown.

## Limites (Tier 0)

- Sem commit de código de produto.
- Sem acesso a PG de produção; raciocínio sobre monorepo + docs + `details` do payload.

## Tier 1 (`investigation.tier === 1`)

Quando o payload traz `investigation.tier: 1` e `playbook: ops-alert-tier1`:

1. Siga o Tier 0 (investigação + markdown).
2. Correção dentro dos gates → PR **draft** (`gh pr create --draft`).
3. Gates: `docs/ops/automations/TIER1_GATES.md`.
4. Callback com `prUrl` (ver playbook suporte — mesmo formato JSON).

**Nunca** merge em `main`. Infra crítica sem fix seguro → só markdown + runbook humano.
