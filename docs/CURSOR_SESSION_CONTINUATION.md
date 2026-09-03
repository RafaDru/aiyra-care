# Continuação de sessão — workspace `aiyra-care`

> **Ativo desde:** 2026-09-03  
> Use este arquivo ao abrir **File → Open Folder → `C:\Users\rafae\Documents\aiyra-care`** e pedir ao agente: *«continua a partir de `docs/CURSOR_SESSION_CONTINUATION.md`»*.

## Estado do projeto

| Item | Status |
|------|--------|
| Monorepo npm | `aiyra-care` (`@aiyra-care/*`) |
| GitHub | `RafaDru/aiyra-care` |
| Workspace Cursor | `C:\Users\rafae\Documents\aiyra-care` |
| PG integração | `aiyracare` (`DATABASE_URL` no `.env`) |
| PG preview | `aiyracare_preview` (`npm run up:preview`) |
| GitHub Environment | `preview` criado |

## O que já foi feito (sessão anterior)

### Ops / sustentação (Trilha A)
- `npm run test:ops`, `npm run ops:smoke`, CI integrado
- Alertas `worker_stale`, `stripe_webhook_failures`
- `docs/ops/RUNBOOK_ALERTS.md`
- `setup:ops-prod`, `setup:ops-preview`, `setup:ops-alerts`

### Dois ambientes
- Ambiente 1 integração: `3010/5173`, `DEPLOYMENT_TIER=integration`
- Ambiente 2 preview: `3020/5174`, `npm run up:preview`, `npm run preview:post-deploy`
- Docs: `TWO_ENV_MODEL.md`, `ENV_PREVIEW.md`, `OPS_TWO_ENV_SETUP.md`

### Rename open-health → aiyra-care
- Pacotes, docs, DB defaults, repo GitHub renomeado
- GCP legado mantido: `openhealth-503119`, bucket `openhealth-documents-503119`

## Próximo passo acordado (Preview GCP)

1. **Secrets** no GitHub Environment `preview` (`DATABASE_URL`, `CRYPTO_KEY`, `API_PUBLIC_URL`, Supabase, Stripe test, ops keys) — ver `docs/infra/GITHUB_ENVIRONMENTS_SECRETS.md`
2. **Deploy real** em `.github/workflows/promote-preview.yml` (Cloud Run + Cloud SQL no projeto GCP)
3. **Promote** com `run_post_deploy=true` quando API preview estiver no ar

## Comandos úteis

```powershell
npm run promotion:gates
npm run up:preview
npm run preview:post-deploy
npm run validate:env-tier
npm run test:ops
```

## Transcript anterior (projeto `Filhos`)

Conversa longa ops + rename: `c1a98798-620e-486b-8755-dc8dc698a7f9` (pasta Cursor `c-Users-rafae-Documents-Filhos`).

## Regras para o agente

- Ler `AGENTS.md` + `docs/project-context.json`
- Não misturar secrets/keys entre integração, preview e prod
- Commits/PR só quando Rafael pedir explicitamente
