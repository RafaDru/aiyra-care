# Runbook — deploy beta / Preview (Ambiente 2)

> **Última atualização:** 2026-09-03  
> Complementa [`DELIVERY_PIPELINE.md`](../DELIVERY_PIPELINE.md) · GCP: [`GCP_PREVIEW_RUNBOOK.md`](./GCP_PREVIEW_RUNBOOK.md)

## Quando usar

Após **aprovação Rafael** em `promotion-report-last.md` e `npm run promotion:gates` verde no Ambiente 1.

| Alvo | Comando / workflow |
|------|-------------------|
| **Preview local** | `npm run up:preview` + `npm run preview:validate` |
| **Preview GCP** | `promote-preview.yml` + [`GCP_PREVIEW_RUNBOOK.md`](./GCP_PREVIEW_RUNBOOK.md) |
| **Produção** | Futuro `deploy-prod.yml` — não promover automaticamente do preview |

## Checklist pré-deploy

- [ ] `npm run promotion:gates` verde
- [ ] `npm run migrate:dry-run` verde (CI ou PG efêmero local)
- [ ] `npm run build:preview-images -- --check-only` (Dockerfiles presentes)
- [ ] Secrets Environment `preview` no GitHub — [`GITHUB_ENVIRONMENTS_SECRETS.md`](./GITHUB_ENVIRONMENTS_SECRETS.md)
- [ ] `validate:ops-dual-keys` — chaves ops distintas integração vs preview
- [ ] Teste manual staging — [`PREVIEW_LOCAL_TEST_GUIDE.md`](./PREVIEW_LOCAL_TEST_GUIDE.md)

## Componentes do deploy

| Serviço | Imagem / artefato | Porta default |
|---------|-------------------|---------------|
| API | `infra/docker/Dockerfile.api` | 8080 |
| Web | `infra/docker/Dockerfile.web` | 8080 (nginx) |
| Ops console | `infra/docker/Dockerfile.ops-console` | 8080 |
| connect-worker | `packages/connect-worker` (processo separado) | — |
| PostgreSQL | Cloud SQL `aiyracare_preview` | 5432 |

Build local (requer Docker):

```powershell
npm run build:preview-images
```

## Post-deploy (obrigatório)

```powershell
npm run preview:post-deploy
# SKIP seed em deploys rotineiros:
$env:SKIP_SEED = '1'
npm run preview:post-deploy
```

## Rollback

1. **Cloud Run:** reverter para revisão anterior (API → web → ops).
2. **Dados:** PG preview é sintético — `seed:staging-refresh` ou snapshot Cloud SQL.
3. **Integração local:** não é afetada (PG e chaves separados).
4. Registrar em `docs/HISTORICO.md` se houver decisão operacional.

## Secrets mínimos (preview host)

`DATABASE_URL`, `CRYPTO_KEY`, `SUPABASE_*`, `API_PUBLIC_URL`, `OPS_METRICS_KEY`, `OPS_ALERT_WEBHOOK_URL`, `OPS_ALERT_DASHBOARD_URL`, `DEPLOYMENT_TIER=preview`.

## CI / PR

- `validate:migrations` — lint de arquivos SQL
- Job `migrations` em `ci.yml` — `migrate:dry-run` em Postgres efêmero
- `promote-preview.yml` — gates + deploy (wire GCP em `env-preview-gcp-deploy`)

## Ver também

- [`TWO_ENV_MODEL.md`](./TWO_ENV_MODEL.md)
- [`ENV_PREVIEW.md`](./ENV_PREVIEW.md)
- [`OPS_PREP_CHECKLIST.md`](./OPS_PREP_CHECKLIST.md)
