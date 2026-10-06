# Quadro de maturidade de produto (CH)

| Campo | Valor |
|-------|--------|
| **ID** | `ops-product-maturity-board` |
| **Status** | `done` |
| **Categoria** | ops / produto |
| **Tier review** | 2 (leitura interna; sem PHI) |

## Resumo

Aba **Produto → Maturidade** no Command Hub: ribbon, KPIs por nível e cards por domínio/superfície, alimentados por [`docs/product/PRODUCT_MATURITY_BOARD.json`](../product/PRODUCT_MATURITY_BOARD.json).

## Superfície técnica

| Tipo | Referência |
|------|------------|
| JSON canônico | `docs/product/PRODUCT_MATURITY_BOARD.json` |
| Loader | `packages/ops-console/src/product-maturity-board.ts` |
| API | `GET /api/product-maturity-board` |
| UI | `packages/ops-console/src/client/ProdutoMaturidadePanel.tsx` |

## QA

- **Gap:** suite Playwright dedicada ainda não catalogada — validação manual: abrir `?group=produto&tab=maturidade`, conferir KPIs e link de doc (ex. failure-probes).
- Build gate: `npm run build --workspace=@aiyra-care/ops-console`
- Regressão CH layout: `packages/ops-console/e2e/` (quando suite `ops-ch-maturity` existir)
