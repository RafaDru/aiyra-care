# <Título da capacidade>

| Campo | Valor |
|-------|--------|
| **ID** | `<roadmap-item-id>` |
| **Épico** | `<epic-id>` |
| **Status** | `planned` \| `in_progress` \| `done` |
| **Categoria** | negócio \| técnico \| regulacao |
| **Prioridade** | P0–P4 |

## Resumo (1 parágrafo)

O que é, para quem, qual problema resolve.

## Objetivo de negócio

- Bullet do valor para a família / operação

## Comportamento (usuário)

1. Passo a passo ou fluxo principal
2. …

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas web | `/patients/:id`, … |
| API | `POST /…` |
| Tabelas PG | `…` |
| UI principal | `packages/web/src/…` |

## Fora de escopo

- O que **não** faz nesta entrega

## Dependências

- Épicos / migrations / integrações

## Métricas / sucesso

- Como saber que funcionou

## Ajuda relacionada

- [`docs/help/…`](../help/…)

## QA (obrigatório ao entregar)

| Campo | Valor |
|-------|--------|
| **Suite** | `docs/testing/suites/<suite-id>.md` |
| **Fixture** | `docs/testing/fixtures/<fixture-id>.json` |
| **Comando manual** | `npm run qa:run -- --suite <suite-id>` |
| **Automação** | `planned` → `packages/web/e2e/suites/<suite-id>.spec.ts` |

Critérios de aceite devem mapear 1:1 aos passos numerados da suite.

## Ver também

- Doc de domínio profundo
- `docs/roadmap.json` item `<id>`
- [`docs/testing/QA_PROCESS.md`](../testing/QA_PROCESS.md)
