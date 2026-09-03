# Deploy staging — esteira CI

> **Última atualização:** 2026-09-02  
> Workflow: `.github/workflows/staging.yml`

## O que roda hoje

| Trigger | Job | Objetivo |
|---------|-----|----------|
| Push `main` | `build-and-test` | API build + validate migrations + critical tests + web build |
| Push `main` | `database-smoke` | PG ephemeral: apply all migrations + seed demo + staging volume |
| Manual `workflow_dispatch` | `deploy-staging` | Placeholder até host staging (ver abaixo) |

## Gate pré-promote (local ou no host)

Com API + PG staging rodando:

```powershell
cd packages/api
npm run staging:probe-gate
```

Falha se `/health` ou PG degradados (latência > threshold).

## Configurar host staging (próximo passo)

1. VM ou PaaS com Node 22 + PostgreSQL.
2. Secrets no GitHub Environment `staging`:
   - `DATABASE_URL`
   - `CRYPTO_KEY` (único staging)
   - `SUPABASE_*` (projeto staging)
   - `STRIPE_*` (test mode)
3. Substituir step placeholder em `staging.yml` por SSH/rsync ou provider (Fly, Railway, etc.).
4. Após deploy: `npm run seed:staging-refresh` **só** se PG staging é dedicado a sintéticos.

## Worker

Rodar `connect-worker` no mesmo host ou segundo processo com:

- `CONNECT_WORKER_EXTERNAL=1` na API
- `SYNC_SCHEDULED_INTERVAL_MS` no worker
- `OPS_ALERTS_INTERVAL_MS` opcional para exercitar alertas

Ver [`ENVIRONMENTS.md`](./ENVIRONMENTS.md).
