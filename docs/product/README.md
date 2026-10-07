# Produto — documentação viva

| Artefato | Uso |
|----------|-----|
| [`GROWTH_CONSULTORIO_CAPILARIDADE.md`](./GROWTH_CONSULTORIO_CAPILARIDADE.md) | GTM família → médico → consultório (tese, fases A–D, MGM gate legal). |
| [`GROWTH_CONSULTORIO_BOARD.json`](./GROWTH_CONSULTORIO_BOARD.json) | Board machine-readable — CH **Produto → Capilarização** e estratégia GTM. |
| [`PRODUCT_MATURITY_BOARD.json`](./PRODUCT_MATURITY_BOARD.json) | Quadro de maturidade por superfície e domínio — editável no repo; lido pelo Command Hub (**Produto → Maturidade**). |
| [`../features/`](../features/index.json) | Feature cards e suites QA por capacidade. |
| [`../roadmap.json`](../roadmap.json) | Épicos e prioridades de entrega. |

## Atualizar o quadro de maturidade

1. Edite `PRODUCT_MATURITY_BOARD.json` (`updatedAt`, itens, `maturity`, `note`, `doc` opcional).
2. Níveis: `mature` · `operational` · `partial` · `pilot` · `planned`.
3. Recarregue a aba **Maturidade** no ops-console (GET `/api/product-maturity-board` lê o arquivo local do monorepo).

Console: `packages/ops-console` · API interna `GET /api/product-maturity-board`.
