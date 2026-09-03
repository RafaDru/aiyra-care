# Ambientes — integração, preview e produção

> **Última atualização:** 2026-09-02  
> **Modelo principal:** [`TWO_ENV_MODEL.md`](./TWO_ENV_MODEL.md) — Ambiente 1 (integração/agentes) → Ambiente 2 (preview estável).  
> Épico roadmap: `platform-environments`. Complementa [`DELIVERY_PIPELINE.md`](../DELIVERY_PIPELINE.md).

## Resumo rápido

| Camada | Nome | Uso |
|--------|------|-----|
| **Ambiente 1** | Integração | Dev, agentes, CI, `npm run promotion:gates` → [`ENV_INTEGRATION.md`](./ENV_INTEGRATION.md) |
| **Ambiente 2** | Preview estável | Rafael testa / POCs → [`ENV_PREVIEW.md`](./ENV_PREVIEW.md) |
| **Produção** | Live | Após CNPJ — abaixo |

Local (`up.ps1`, `3010/5173`, `aiyracare`) = **Ambiente 1** (permanece local). Preview local (`up:preview`, `3020/5174`, `aiyracare_preview`) = **Ambiente 2** até ritmo funcional; depois Preview no **GCP**.

## Princípio (três camadas infra)

Três camadas com **paridade de topologia** (API + web + worker + PG + ops), mas **dados diferentes**:

| Ambiente | Dados | Objetivo |
|----------|-------|----------|
| **Integração (1)** | PG local + massas demo + scrapers reais | Dev/agentes + gates antes de aprovar |
| **Preview (2)** | Sintéticos — shape produtivo | Testes Rafael; bugs técnicos mínimos |
| **Produção** | Dados reais de clientes | Go-live após CNPJ + gates fiscais |

**Regra LGPD:** nunca restaurar dump de produção em local/staging sem processo de anonimização formal.

---

## Matriz de paridade

| Componente | Integração (1) | Preview (2) | Produção |
|------------|----------------|-------------|----------|
| API (`3010`) | `npm run dev` / `up.ps1` `:3010` | `up:preview` `:3020` | Deploy |
| Web (`5173`) | Vite dev `:5173` | Vite dev `:5174` | Build + CDN/host |
| Ops console | `:3013` opcional | `:3023` | Sim (restrito) |
| Connect worker | Opcional / script | Recomendado local | **Obrigatório** |
| PostgreSQL | `aiyracare` | `aiyracare_preview` | Instância prod |
| Neo4j | Off ou cloud dev | Off ou projeto staging | Opt-in |
| Stripe | **Test** keys | **Test** keys | **Live** keys |
| `COMPLIANCE_GATE` | `0` típico | `1` recomendado | `1` |
| `CRYPTO_KEY` | Dev (único) | Staging (único) | Prod (único) |
| `OPS_METRICS_KEY` | Opcional | Sim | Sim |
| Supabase | Dev project ou local auth | Staging project | Prod project |

---

## Massas de demonstração

```powershell
cd packages/api
node scripts/seed-demo-data.mjs          # upsert conta demo + 2 pacientes
node scripts/seed-demo-data.mjs --reset  # remove só IDs demo e recria
npm run seed:staging-volume              # + sync_jobs / product_events / llm
npm run seed:staging-refresh             # reset demo + volume completo
npm run migrate:all                      # todas migrations NNN (PG vazio)
npm run staging:probe-gate               # gate pré-promote (API up)
npm run preview:post-deploy                # Ambiente 2: seed + probe + alerts
npm run validate:env-tier                  # DEPLOYMENT_TIER vs ops flags
```

Templates `.env`: `.env.integration.example` · `.env.preview.example` · secrets GitHub: [`GITHUB_ENVIRONMENTS_SECRETS.md`](./GITHUB_ENVIRONMENTS_SECRETS.md) · deploy preview: [`DEPLOY_PREVIEW.md`](./DEPLOY_PREVIEW.md).

Variáveis opcionais volume: `STAGING_SEED_SYNC_JOBS`, `STAGING_SEED_EVENTS`, `STAGING_SEED_LLM_EVENTS`.

IDs fixos documentados no script — **não** colidir com contas reais se `auth_subject` demo não existe no Supabase.

Após seed: rodar `node scripts/seed-legal-documents.mjs` se compliance gate em staging.

---

## Staging «shape produtivo»

Objetivo: volumes e **mix** parecidos com produção (N `integration_links`, jobs `sync_jobs`, `product_events`, `llm_usage_events`) com dados **faker**.

1. `seed-demo-data.mjs` — base clínica.
2. `seed-staging-volume.mjs` — jobs/eventos sintéticos (`staging-volume-seed`).
3. `npm run seed:staging-refresh` — reset + ambos.

Sondas antes de promote: `npm run staging:probe-gate`.

---

## Esteiras (CI/CD)

**CI PR/main:** `.github/workflows/ci.yml` — build + validate migrations + critical tests.

**Staging:** `.github/workflows/staging.yml` — build + **database-smoke** (PG ephemeral + seeds) + deploy placeholder.

**Produção:** `.github/workflows/deploy-prod.yml` — manual `workflow_dispatch` + checklist.

Detalhe deploy staging: [`DEPLOY_STAGING.md`](./DEPLOY_STAGING.md). Backup: [`BACKUP.md`](./BACKUP.md).

| Gate | Onde |
|------|------|
| `validate-migrations.mjs` | CI |
| `database-smoke` job | staging.yml |
| Smoke E2E login → paciente | `del-e2e-smoke` (backlog) |
| Deploy staging real | secrets Environment `staging` |
| Deploy prod manual | `deploy-prod.yml` + backup |

---

## Secrets

Template: `.env.example` na raiz. **Nunca** commitar `.env`.

| Variável | Local | Staging | Prod |
|----------|-------|---------|------|
| `DATABASE_URL` | local PG | staging URL | prod URL |
| `CRYPTO_KEY` | dev hex | staging hex | prod hex |
| `STRIPE_*` | test | test | live |
| `SUPABASE_*` | dev | staging | prod |

---

## Runbook rápido — local

```powershell
# Ver AGENTS.md — restart completo
taskkill /F /IM node.exe 2>&1 | Out-Null
Start-Sleep 2
powershell -File scripts/up.ps1
```

Logs: `api.log`, `web.log`, `ops-console.log`.

---

## Runbook — promote staging → prod (futuro)

1. CI verde + migration dry-run.
2. Backup PG prod.
3. Deploy API → worker → web.
4. `ops:probe` + smoke billing (test mode em staging já validado).
5. Monitorar `GET /ops/alerts` 30 min.

Rollback: redeploy tag anterior + restore PG se migration destrutiva.

---

## Flags de runtime por ambiente

| Flag | Local típico | Staging | Produção |
|------|--------------|---------|----------|
| `NEO4J_SYNC_ENABLED` | `0` | `0` ou `1` teste | `1` se Neo4j prod |
| `COMPLIANCE_GATE_ENABLED` | `0` | `1` | `1` |
| `CONNECT_WORKER_EXTERNAL` | `0` ou `1` | `1` | `1` |
| `SYNC_SCHEDULED_INTERVAL_MS` | `0` | worker | worker |
| `OPS_ALERTS_INTERVAL_MS` | `0` | worker opcional | worker |

---

## Connect worker (paridade)

Staging e prod devem rodar `packages/connect-worker` (ou script agendado) com a mesma `DATABASE_URL` e `CRYPTO_KEY` da API. API com `CONNECT_WORKER_EXTERNAL=1` evita loop duplicado.

```powershell
npm run connect-worker
```

Validar em staging antes de prod: scheduled sync + `ops:alerts-check` sem stuck jobs.
