# GTM — capilarização consultório

| Campo | Valor |
|-------|--------|
| **ID** | `growth-consultorio-capilaridade` |
| **Épico** | `b2b-partner-platform` |
| **Status** | `in_progress` |
| **Categoria** | negócio |
| **Prioridade** | P1 |
| **Tier review** | 0 (doc + CH; sem mudança de runtime nesta entrega) |

## Resumo

Estratégia e quadro vivos para o loop **família → médico → consultório**: tese, fases A–D, canais, métricas norte e decisões abertas — espelhados no Command Hub (Estratégia + Produto).

## Objetivo de negócio

- Manter foco no GTM consultório sem perder o fio entre Marketing, Produto e entrega técnica.
- Ancorar o gancho já entregue (**Levar na consulta** / portal médico) nas fases B–D (pro, consultório, MGM).

## Documentação canônica

| Artefato | Caminho |
|----------|---------|
| Estratégia completa | [`docs/product/GROWTH_CONSULTORIO_CAPILARIDADE.md`](../product/GROWTH_CONSULTORIO_CAPILARIDADE.md) |
| Board JSON (CH) | [`docs/product/GROWTH_CONSULTORIO_BOARD.json`](../product/GROWTH_CONSULTORIO_BOARD.json) |
| Discovery MGM | [`docs/discovery/referral-growth-loop.md`](../discovery/referral-growth-loop.md) |
| Share consultório (feito) | [`patient-clinical-export.md`](./patient-clinical-export.md) |

## Superfície Command Hub

| Área | Referência |
|------|------------|
| Negócio → Estratégia → **Capilarização consultório** | `packages/ops-console/content/strategy/growth-consultorio-capilaridade.md` |
| Produto → **Capilarização** | `ProdutoCapilaridadePanel.tsx`, `GET /api/growth-consultorio-board` |

## QA

- Tier 0: sem suite Playwright nova.
- Gate: `cd packages/ops-console && npm run build`

## Relacionado

- Maturidade: itens «Share consultório», «Portal médico», «Plano profissional» em `PRODUCT_MATURITY_BOARD.json`
