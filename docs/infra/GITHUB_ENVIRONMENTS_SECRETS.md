# GitHub Environments — secrets e variáveis

> **Última atualização:** 2026-09-02  
> Matriz para configurar **Settings → Environments** quando houver hosts cloud.  
> Local hoje: copiar blocos de `.env.integration.example` / `.env.preview.example`.

## Environments

| Environment | Uso | Workflow |
|-------------|-----|----------|
| `staging` | Host staging legado (opcional) | `staging.yml` |
| `preview` | Ambiente 2 estável (Rafael) | `promote-preview.yml` |
| `integration` | Host integração futuro (opcional) | — |
| `production` | Go-live | `deploy-prod.yml` (futuro) |

**Isolamento obrigatório:** `DATABASE_URL`, `CRYPTO_KEY`, `OPS_METRICS_KEY`, `OPS_ALERT_WEBHOOK_URL` — **nunca** reutilizar entre camadas.

## Secrets comuns (preview / staging / prod)

| Secret | Preview | Integração local | Produção |
|--------|---------|------------------|----------|
| `DATABASE_URL` | PG dedicado preview | `aiyracare` | PG prod |
| `CRYPTO_KEY` | 64 hex único | dev key | prod key |
| `SUPABASE_URL` | projeto staging | dev | prod |
| `SUPABASE_SERVICE_ROLE` | staging | dev | prod |
| `STRIPE_SECRET_KEY` | test | test | live |
| `STRIPE_WEBHOOK_SECRET` | test endpoint | test | live |
| `API_PUBLIC_URL` | `https://preview...` ou `http://127.0.0.1:3020` | `http://127.0.0.1:3010` | `https://api...` |
| `OPS_METRICS_KEY` | preview-only | integration-only | prod-only |
| `OPS_ALERT_WEBHOOK_URL` | ntfy `aiyracare-preview` | local `:3012` ou off | ntfy prod |
| `OPS_ALERT_DASHBOARD_URL` | console preview | `:3013` | ops prod URL |

## Variáveis (não secretas) — preview host

Configurar no host ou como Environment variables no GitHub:

| Variável | Preview host | Integração |
|----------|--------------|------------|
| `DEPLOYMENT_TIER` | `preview` | `integration` |
| `CONNECT_WORKER_EXTERNAL` | `1` | `0` ou `1` |
| `OPS_WORKER_MONITOR` | `1` | `0` |
| `OPS_ALERTS_DISPATCH_MODE` | `human_required` | `human_required` |
| `OPS_ALERTS_MIN_SEVERITY` | `critical` | `critical` |
| `OPS_ALERTS_INTERVAL_MS` | `900000` (worker) | `0` na API |
| `COMPLIANCE_GATE_ENABLED` | `0` ou `1` | `0` local |

## Setup scripts por camada

```powershell
# Integração (Ambiente 1)
npm run setup:ops-alerts
# DEPLOYMENT_TIER=integration no .env

# Preview (Ambiente 2)
npm run setup:ops-preview
# DEPLOYMENT_TIER=preview no .env

# Produção (só quando host prod existir)
npm run setup:ops-prod
# DEPLOYMENT_TIER=production
```

Validar alinhamento: `npm run validate:env-tier`

## Post-deploy preview

Local ou CI após deploy:

```powershell
npm run preview:post-deploy
# Host cloud após migrate: SKIP_SEED=1 npm run preview:post-deploy
```

Workflow `promote-preview.yml` — job `post-deploy` quando secrets `API_PUBLIC_URL` + `DATABASE_URL` existem no Environment `preview` e input `run_post_deploy=true`.

## Portas locais paralelas

| Serviço | Integração | Preview local |
|---------|------------|---------------|
| API | 3010 | 3020 |
| Web | 5173 | 5174 |
| Ops console | 3013 | 3023 |
| Notifier | 3012 | 3022 |

Ver [`OPS_TWO_ENV_SETUP.md`](./OPS_TWO_ENV_SETUP.md), [`ENV_PREVIEW.md`](./ENV_PREVIEW.md).

## Checklist novo Environment `preview`

1. Criar Environment `preview` no GitHub (required reviewers opcional).
2. Adicionar secrets da tabela acima.
3. Configurar host: Node 22 + PostgreSQL dedicado.
4. Rodar migrations no host (`apply-all-migrations.mjs`).
5. Primeiro deploy via `promote-preview.yml` (workflow_dispatch).
6. `SKIP_SEED=1 npm run preview:post-deploy` no host ou job CI `post-deploy`.
7. Subir `connect-worker` com `OPS_ALERTS_INTERVAL_MS=900000`.
8. Smoke manual web preview.

Ver [`DEPLOY_PREVIEW.md`](./DEPLOY_PREVIEW.md).
