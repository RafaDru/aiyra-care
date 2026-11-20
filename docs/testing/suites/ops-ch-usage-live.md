# Suite — `ops-ch-usage-live`

| Campo | Valor |
|-------|--------|
| **ID** | `ops-ch-usage-live` |
| **Lane** | business |
| **Tier** | 1 |

Command Hub — KPIs uso ao vivo, timeline e heatmap (`tab=usage`).

## Pré-requisitos

- Postgres com migração **090** (`idx_product_events_usage_*`)
- `npm run ops:console` em `:3013`
- Opcional: seed de `product_events` com `app_screen_viewed` últimas 24h

## Critérios

| # | Ação | Esperado |
|---|------|----------|
| 1 | `GET /api/metrics` | `metrics.usageLive.activeAccounts` numérico + `windowMinutes` 15 |
| 2 | Abrir Operação → Visão geral | Bloco «Uso ao vivo» com contas ativas |
| 3 | Produto → Uso ao vivo | Presets Hoje/7d/30d carregam sem erro |
| 4 | Gráfico timeline | Séries Contas/Sessões/Telas visíveis |
| 5 | Heatmap | Pelo menos uma área ou estado vazio claro |
| 6 | `GET /api/usage?preset=7d` | JSON com `live`, `series`, `heatmap` |

## Automatizado

- `packages/api/tests/ops-usage.test.ts` (domínio range + heatmap)

## Comando

`npm run test:ops` inclui vitest ops; validação manual CH após deploy notebook.