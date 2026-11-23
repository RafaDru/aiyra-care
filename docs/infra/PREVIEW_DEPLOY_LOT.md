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
3. **Registro** — atualizar este arquivo + [`preview-deploy-status.json`](./preview-deploy-status.json) + nota curta em [`../internal/beta/CURRENT.md`](../internal/beta/CURRENT.md) (espelho repo de `internal/beta/`: SHA, URL, o que a beta testa). **Não** disparar `workflow_dispatch`.

## Status vivo (máquina)

Ver [`preview-deploy-status.json`](./preview-deploy-status.json) — `lastPromoteMainSha` é o SHA **já** no Cloud Run; `originMainSha` / `git rev-parse origin/main` mostram se preview está atrás. `promotePending: true` = lote aberto, sem Promote.

**2026-11-23 (lote aberto):** Preview `828eb3b` (AC-126) ≠ `main` `63fb1b3` (#232 AC-136). Promote **pendente** — só no fechamento de lote ou pedido Rafael.

## Hooks

- `after-file-edit-delivery-lot` marca sessão com produto tocado.
- `stop` lembra o triângulo **só se a sessão editou produto** (não a cada stop só por preview atrás de `main`) — **sem** executar promote.

## Gatilhos de promote

| Sim | Não |
|-----|-----|
| Rafael: «sobe preview», «Jenifer pode testar» | Cada merge tier 0/1 isolado |
| Fim de lote (wave closeout / skill) | Só doc ou só notebook |
| Mudança visível PWA/mobile para tester externo | CI verde apenas |

## Histórico de lotes (manual)

| Data (UTC) | `main` SHA (curto) | Lote | Workflow run |
|------------|-------------------|------|--------------|
| 2026-11-23 | `828eb3b` | AC-126 ícone + shell v1 | [45229326123](https://github.com/RafaDru/aiyra-care/actions/runs/45229326123) |
| 2026-11-23 | `f8659fa` | Lote #234–#236 (AC-136 + quick capture + policy) | [45250015448](https://github.com/RafaDru/aiyra-care/actions/runs/45250015448) |

Lote aberto (sem Promote): `main` `63fb1b3` (#232 AC-136) já passou o preview `828eb3b`. Candidatos a incluir no fechamento: #235 (registro rápido) + #234 (spec) + #236 (esta política), se mergeados.

## Ver também

- [`../DELIVERY_PIPELINE.md`](../DELIVERY_PIPELINE.md)
- [`../product/BETA_MOBILE_CHANNEL_PWA.md`](../product/BETA_MOBILE_CHANNEL_PWA.md)
- Runbook GCP preview