# Preview GCP — promote por lote (beta)

| Campo | Valor |
|-------|--------|
| **Decisão** | 2026-11-23 (Rafael) |
| **Política** | **Merge** em `main` pode ser frequente; **Promote to Preview** só no **fechamento de lote** ou quando Rafael pedir |

## Por quê

Muitos pedidos por dia → várias PRs/merges. CI em PR é barato; promote Cloud Run (~5 min + secrets) não deve repetir a cada PR isolado.

## Triângulo (fechamento de lote)

1. **Merge(s)** em `main` com CI verde (quantos forem no lote).
2. **Promote** — GitHub Actions → `Promote to Preview (Ambiente 2)` · `ref=main` · `deploy_gcp=true` (humano ou CH; agentes **não** disparam workflow automaticamente).
3. **Registro** — atualizar este arquivo + [`preview-deploy-status.json`](./preview-deploy-status.json) + nota curta no Project store `internal/beta/` (SHA, URL, o que a beta testa).

## Status vivo (máquina)

Ver [`preview-deploy-status.json`](./preview-deploy-status.json) — `lastPromoteMainSha` deve coincidir com o SHA promovido; compare com `git rev-parse origin/main` para saber se preview está atrás.

## Hooks

- `after-file-edit-delivery-lot` marca sessão com produto tocado.
- `stop` pode lembrar o triângulo se preview ≠ `main` — **sem** executar promote.

## Gatilhos de promote

| Sim | Não |
|-----|-----|
| Rafael: «sobe preview», «Jenifer pode testar» | Cada merge tier 0/1 isolado |
| Fim de lote (wave closeout / skill) | Só doc ou só notebook |
| Mudança visível PWA/mobile para tester externo | CI verde apenas |

## Histórico de lotes (manual)

| Data (UTC) | `main` SHA (curto) | Lote | Workflow run |
|------------|-------------------|------|--------------|
| 2026-11-23 | `828eb3b` | AC-126 ícone + shell v1 | [#21](https://github.com/RafaDru/aiyra-care/actions/runs/45229326123) |

Próximo lote sugerido: #232 (AC-136) + #235 (registro rápido) + #234 (doc) após merges.

## Ver também

- [`../DELIVERY_PIPELINE.md`](../DELIVERY_PIPELINE.md)
- [`../product/BETA_MOBILE_CHANNEL_PWA.md`](../product/BETA_MOBILE_CHANNEL_PWA.md)
- Runbook GCP preview