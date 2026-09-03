# Ambiente 2 — Preview estável

> **Última atualização:** 2026-09-02  
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
| Ops console | `:3023` (PG `aiyracare_preview`) |
| Setup opcional | `npm run setup:ops-preview` — **não** misturar com `.env` de integração sem querer |
| Worker | `CONNECT_WORKER_EXTERNAL=1` na API preview se testar sync agendado |
| Métricas | `OPS_METRICS_KEY` distinto se usar notifier preview (`:3022`) |

Ver [`OPS_TWO_ENV_SETUP.md`](./OPS_TWO_ENV_SETUP.md).

## Refresh programado

| Frequência | Ação |
|------------|------|
| Após cada promote local | `staging:probe-gate` na API `:3020` |
| Semanal (opcional) | `seed:staging-refresh` no PG preview |
| Antes de demo importante | `npm run up:preview` (re-seed + restart) |

## Futuro: Preview no GCP

Quando o fluxo local estiver redondo:

- PG dedicado (Cloud SQL) + dados sintéticos (`seed:staging-refresh`).
- API/web/worker no GCP — ver [`DEPLOY_PREVIEW.md`](./DEPLOY_PREVIEW.md).
- GitHub Environment `preview` + `promote-preview.yml`.
- Ops: keys e webhook distintos do Ambiente 1 local.

Projeto GCP: `openhealth-503119` — [`GCP_BILLING_ALERTS.md`](./GCP_BILLING_ALERTS.md). **Ambiente 1 permanece local.**

## O que você deve encontrar aqui

- Funcionalidades **já validadas** no Ambiente 1.
- Bugs de **produto/UX** — reportar para backlog.
- Bugs **técnicos** — regressão; corrigir no Ambiente 1 e **re-promover**.

## Promoção preview → produção

Não automática. Gates: CNPJ, Stripe live, `human-review-gates`, `deploy-prod.yml`.
