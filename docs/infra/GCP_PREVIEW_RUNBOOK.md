# Runbook — Preview no GCP (Ambiente 2)

> **Última atualização:** 2026-09-03  
> **Pré-requisito:** staging local validado (`npm run preview:validate` verde + aprovação em `promotion-report-last.md`).  
> **Projeto GCP:** `openhealth-503119` · Billing alerts: [`GCP_BILLING_ALERTS.md`](./GCP_BILLING_ALERTS.md)

## Objetivo

Hospedar **Preview** (dados sintéticos, ops isolado) no GCP sem misturar com integração local (Ambiente 1).

## Arquitetura alvo (v1)

```mermaid
flowchart LR
  subgraph gcp [GCP Preview]
    CR_API[Cloud Run API]
    CR_WEB[Cloud Run Web ou Firebase Hosting]
    CR_OPS[Cloud Run Ops Console]
    SQL[(Cloud SQL aiyracare_preview)]
    CW[connect-worker Job/VM]
  end
  GH[GitHub Environment preview] -->|promote-preview.yml| CR_API
  CR_API --> SQL
  CR_OPS --> SQL
  CW --> CR_API
```

| Componente | Sugestão v1 | Notas |
|------------|-------------|-------|
| PostgreSQL | Cloud SQL `aiyracare_preview` | Instância **dedicada**; não compartilhar com prod |
| API | Cloud Run `:443` | `DEPLOYMENT_TIER=preview`, `CONNECT_WORKER_EXTERNAL=1` |
| Web | Cloud Run ou static + CDN | `VITE_API_URL` + `VITE_OPS_CONSOLE_URL` do host preview |
| Ops console | Cloud Run `:443` separado | PG direto; chave `OPS_METRICS_KEY` preview-only |
| Worker | Cloud Run Job ou GCE | `OPS_ALERTS_INTERVAL_MS`, probe, scheduled sync |
| Alertas | ntfy `aiyracare-preview` ou webhook Slack | Distinto de integração e prod |

## Checklist — provisionar (uma vez)

### 0. Imagens Docker

```powershell
npm run build:preview-images -- --check-only   # CI / sem Docker
npm run build:preview-images                   # build local (API, web, ops-console)
```

Arquivos: `infra/docker/Dockerfile.api`, `Dockerfile.web`, `Dockerfile.ops-console`.

### 1. Cloud SQL

- [ ] Criar instância PostgreSQL 15+ (tier dev: `db-f1-micro` ou `db-g1-small`)
- [ ] Database `aiyracare_preview`, user app com senha forte
- [ ] Aplicar migrations: `npm run migrate:all` com `DATABASE_URL` do Cloud SQL
- [ ] Seed inicial: `npm run seed:staging-refresh` (sintético LGPD-safe)

### 2. Secrets (GitHub Environment `preview`)

Ver [`GITHUB_ENVIRONMENTS_SECRETS.md`](./GITHUB_ENVIRONMENTS_SECRETS.md). Mínimo:

| Secret | Exemplo |
|--------|---------|
| `DATABASE_URL` | `postgresql://...@/aiyracare_preview` |
| `CRYPTO_KEY` | 64 hex **único preview** |
| `OPS_METRICS_KEY` | distinto de `.env` local |
| `OPS_ALERT_WEBHOOK_URL` | `https://ntfy.sh/aiyracare-preview` |
| `OPS_ALERT_DASHBOARD_URL` | `https://ops.preview.<domínio>` |
| `API_PUBLIC_URL` | `https://api.preview.<domínio>` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE` | projeto staging Supabase |

Rodar local: `npm run setup:ops-preview` gera `.env.preview` — **não** copiar chaves para GCP; gerar novas.

### 3. Cloud Run — API

- [ ] Imagem: `packages/api` (Dockerfile ou buildpack Node 22)
- [ ] Env: ver `.env.preview.example` + secrets acima
- [ ] `CONNECT_WORKER_EXTERNAL=1`, `OPS_WORKER_MONITOR=1`
- [ ] Health: `GET /health`
- [ ] VPC connector se Cloud SQL private IP

### 4. Cloud Run — Web

- [ ] Build Vite com `VITE_API_URL` e `VITE_OPS_CONSOLE_URL` do host preview
- [ ] Redirect Supabase OAuth: incluir URL preview em allowed redirects

### 5. Cloud Run — Ops console

- [ ] `packages/ops-console` — `OPS_CONSOLE_PORT` via `PORT` do Run
- [ ] `DATABASE_URL` mesmo PG preview
- [ ] Não expor publicamente sem auth de rede ou IAP (fase 1: URL obscura + ops key)

### 6. connect-worker (Cloud Run Jobs)

Dois jobs no GCP Preview (substituem o loop local):

| Job | Modo | Schedule default |
|-----|------|------------------|
| `aiyracare-preview-worker-sync` | `CONNECT_WORKER_JOB_MODE=sync` | `*/30 * * * *` |
| `aiyracare-preview-worker-ops` | probe + alerts | `*/15 * * * *` |

```powershell
npm run deploy:preview:worker -- --dry-run --tag=test
npm run deploy:preview:worker -- --tag=main   # após API no ar
```

Workflow `promote-preview.yml` — input `deploy_worker=true` (use `--jobs-only` no CI até `GCP_SCHEDULER_SA_EMAIL` configurado).

**Local staging (agora):** com preview no ar:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
$env:DEPLOYMENT_TIER = "preview"
$env:OPS_ALERTS_INTERVAL_MS = "900000"
npm run connect-worker
```

Na API preview: `CONNECT_WORKER_EXTERNAL=1` (sem loop embutido).

## Checklist — cada promote

1. Rafael aprova gates locais (`promotion:gates` + teste manual staging).
2. GitHub Actions → **Promote to Preview** → branch `main`.
3. Gates CI (`run-promotion-gates.mjs`) — artefato `promotion-report-last.md`.
4. Job `promote` — deploy real (substituir placeholder em `promote-preview.yml`).
5. Job `post-deploy` (`run_post_deploy=true`):
   - `preview-post-deploy.mjs` → probe + `ops:alerts-check`
   - `SKIP_SEED=1` em deploys rotineiros; seed só refresh semanal
6. Smoke Rafael: login, Lucas/Ana demo, console ops, alerta simulado.

## Comandos pós-deploy (no host ou CI)

```bash
npm run preview:post-deploy
# ou manual:
npm run seed:staging-refresh   # só refresh
npm run staging:probe-gate
npm run ops:alerts-check
```

## Rollback

1. Reverter revisão Cloud Run anterior (API + web).
2. PG preview: **não** restaurar prod; em emergência `seed:staging-refresh` ou snapshot Cloud SQL.
3. Registrar incidente em `docs/HISTORICO.md`.

## Local vs GCP — naming

| Local `.test` | GCP (planejado) |
|---------------|-----------------|
| `staging.aiyracare.test` | `app.preview.aiyracare.com.br` ou similar |
| `api.staging.aiyracare.test` | `api.preview...` |
| `ops.staging.aiyracare.test` | `ops.preview...` |

## Próximo passo de implementação

1. ~~Dockerfile API + web~~ — `infra/docker/`
2. ~~`gcp-preview-deploy.mjs` + `promote-preview.yml` (`deploy_gcp=true`)~~
3. Provisionar Artifact Registry: `npm run provision:preview:gcp`
4. Configurar secrets GitHub Environment `preview` — [`GITHUB_ENVIRONMENTS_SECRETS.md`](./GITHUB_ENVIRONMENTS_SECRETS.md)
5. Primeiro deploy: Actions → Promote to Preview → `deploy_gcp=true` → `run_post_deploy=true`
6. connect-worker como Cloud Run Job (backlog)

## Ver também

- [`DEPLOY_PREVIEW.md`](./DEPLOY_PREVIEW.md)
- [`ENV_PREVIEW.md`](./ENV_PREVIEW.md)
- [`LOCAL_HOSTNAMES.md`](./LOCAL_HOSTNAMES.md)
- [`OPS_PREP_CHECKLIST.md`](./OPS_PREP_CHECKLIST.md)
