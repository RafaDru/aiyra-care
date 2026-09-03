# Ambiente 1 — Integração (dev + agentes)

> **Última atualização:** 2026-09-02  
> Onde features nascem e são **validadas antes** de ir ao preview estável.

## O que é

- **Hosting:** **local** — `up.ps1`, PG `aiyracare`, API `3010`, web `5173`.
- **CI:** cada PR/main — build, `test:critical`, migrations, E2E smoke.

## Fluxo do agente / dev

```text
1. Ler AGENTS.md + tier review (tier ≥ 2)
2. Implementar
3. npm run promotion:gates   # relatório completo
4. Entregar promotion-report-last.md ao Rafael
5. Aguardar aprovação — NÃO promover ao Ambiente 2 sozinho
```

## Testes neste ambiente

Rodar [`TESTING_VERTICALS.md`](../TESTING_VERTICALS.md) via `npm run promotion:gates`.

| Vertical | Quando | Onde roda |
|----------|--------|-----------|
| Funcional | Sempre que toca código | CI + gates locais |
| Integrado | Sync, billing, SUS, migrations | CI database-smoke + manual convênio |
| Segurança | Tier 2+, auth, credenciais | test:critical + skill review |
| Performance | Sync/Ops mudanças | ops:probe latência |

## Secrets (integration)

Template: `.env.integration.example` · matriz GitHub: [`GITHUB_ENVIRONMENTS_SECRETS.md`](./GITHUB_ENVIRONMENTS_SECRETS.md)

| Variável | Notas |
|----------|--------|
| `DEPLOYMENT_TIER` | `integration` |
| `DATABASE_URL` | PG local `aiyracare` |
| `CRYPTO_KEY` | Único — nunca prod |
| `SUPABASE_*` | Projeto dev Supabase |
| `STRIPE_*` | Test mode |
| `OPS_METRICS_KEY` | Opcional local |
| `OPS_WORKER_MONITOR` | `0` — ver `npm run validate:env-tier` |
| `COMPLIANCE_GATE_ENABLED` | `0` local |

## Comandos úteis

```powershell
powershell -File scripts/up.ps1
cd packages/api && npm run promotion:gates
cd packages/api && npm run test:critical
cd packages/web && npm run test:e2e
```

## O que **não** é este ambiente

- Não é onde Rafael faz aceite de produto final (→ Ambiente 2).
- Não usa dados reais de clientes.
- Não é produção.
