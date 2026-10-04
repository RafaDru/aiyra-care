# Ops console (Command Hub)

Console interno de observabilidade e operação — **:3013** (preview **:3023**).

## Comandos

```bash
npm run dev          # API + Vite middleware
npm run build        # dist/client + dist/server.js
npm start            # produção
```

## Abas

Métricas Postgres/API, negócio, **Estratégia** (snapshots markdown em `content/strategy/`), issues, produto, suporte, sync, Ava, infra, custo.

### Estratégia (advisory)

Relatórios Marketing / Financeiro / CX copiados do Project store. Ver `content/strategy/README.md` para refresh via coordinator.

URL: `?tab=strategy&strategy=mkt|finance|cx`

## Layout Command Hub

Header + grupos no topo + sidebar + conteúdo + rodapé. Mock: `http://127.0.0.1:3013/?mock=ch-layout`. Ver [`docs/ops/CONSOLE.md`](../../docs/ops/CONSOLE.md).

Feature card: [`docs/features/ops-strategy-advisory.md`](../../docs/features/ops-strategy-advisory.md)
