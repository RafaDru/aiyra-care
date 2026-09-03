# Ambiente 2 — Preview estável

> **Última atualização:** 2026-09-03  
> Onde Rafael testa continuamente, pede POCs e ajustes — **sem surpresas técnicas**.

## Fase atual: local → GCP

**Agora:** Preview na mesma máquina que Integração (PG + portas distintas).  
**Depois:** host Preview no **GCP**, quando o ritmo local (promoção + seus testes + ops) estiver confortável.

| Serviço | URL local (hoje) |
|---------|------------------|
| Web | http://localhost:5174 |
| API | http://127.0.0.1:3020 |
| Ops console | http://127.0.0.1:3023 |
| PG | `aiyracare_preview` |

Integração (Ambiente 1) segue em 3010/5173 + `aiyracare` — **podem rodar ao mesmo tempo**.

**Hostnames locais (opcional):** [`LOCAL_HOSTNAMES.md`](./LOCAL_HOSTNAMES.md) — `staging.aiyracare.test` sem lembrar portas.

## Ritual automatizado

```powershell
npm run preview:validate
```

Roda dual-keys, health checks, post-deploy no PG preview, smoke ops e dev-audit bridge.

## Subir Preview local

Após **aprovação** do relatório do Ambiente 1:

```powershell
npm run up:preview
```

Isso cria o DB (se faltar), roda `seed:staging-refresh` no PG preview e sobe API/web/ops nas portas acima.

Só refresh de dados (stack já rodando):

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
npm run seed:staging-refresh
```

Criar DB manualmente: `npm run preview:db`

## Critério de entrada

Só código que passou:

1. `npm run promotion:gates` verde (ou exceções documentadas no relatório).
2. Aprovação explícita de Rafael.
3. CI verde na mesma revisão (Ambiente 1).

## Após cada promoção local

```powershell
npm run preview:post-deploy
```

Equivalente (manual): `API_PUBLIC_URL=http://127.0.0.1:3020` + `staging:probe-gate` + `ops:alerts-check`.
Host cloud sem reset de dados: `SKIP_SEED=1 npm run preview:post-deploy`.

Web: smoke manual — login → paciente demo → vacinas / carteira / integrações em **5174**.

## Ops no preview (local)

| Item | Config |
|------|--------|
| Ops console | `:3023` ou `ops.staging.aiyracare.test` — tag **Ambiente Staging** no header |
| Status stack | `npm run env:status` |
| Hostnames | `npm run hosts:register` + `npm run caddy:local` — [`LOCAL_HOSTNAMES.md`](./LOCAL_HOSTNAMES.md) |
| Setup opcional | `npm run setup:ops-preview` |
| Worker local | `DEPLOYMENT_TIER=preview` + `npm run connect-worker` (sync + ops alerts) |
| Ritual | `npm run preview:validate` |

Ver [`OPS_TWO_ENV_SETUP.md`](./OPS_TWO_ENV_SETUP.md) · [`PREVIEW_LOCAL_TEST_GUIDE.md`](./PREVIEW_LOCAL_TEST_GUIDE.md).

## Futuro: Preview no GCP

Código pronto — aguarda Cloud SQL + secrets GitHub:

```powershell
npm run provision:preview:gcp -- --dry-run
npm run deploy:preview:gcp -- --dry-run --build-only --tag=test
npm run deploy:preview:worker -- --dry-run --jobs-only --tag=test
```

Workflow: `promote-preview.yml` com `deploy_gcp` + `deploy_worker`. Ver [`GCP_PREVIEW_RUNBOOK.md`](./GCP_PREVIEW_RUNBOOK.md).

## Refresh programado

| Frequência | Ação |
|------------|------|
| Após cada promote local | `npm run preview:validate` |
| Semanal (opcional) | `seed:staging-refresh` no PG preview |
| Antes de demo importante | `npm run up:preview` (re-seed + restart) |

Projeto GCP (quando for a hora): `openhealth-503119` — [`GCP_BILLING_ALERTS.md`](./GCP_BILLING_ALERTS.md). **Ambiente 1 permanece local.**

## O que você deve encontrar aqui

- Funcionalidades **já validadas** no Ambiente 1.
- Bugs de **produto/UX** — reportar para backlog.
- Bugs **técnicos** — regressão; corrigir no Ambiente 1 e **re-promover**.

## Promoção preview → produção

Não automática. Gates: CNPJ, Stripe live, `human-review-gates`, `deploy-prod.yml`.
