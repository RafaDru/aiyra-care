# Sincronizar Amil — filtro de período e beneficiário

| Campo | Valor |
|-------|--------|
| **ID** | `beneficiary-view-filter` |
| **Épico** | `amil-routing-classifier` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P2 |

## Resumo

Antes de sincronizar a Amil, o responsável pode escolher **período de utilização** (atendimentos realizados) e, opcionalmente, **marca ótica** de um beneficiário específico. Reduz tempo de sync e foca importação em janela relevante.

## Objetivo de negócio

- Famílias com vários dependentes na mesma carteirinha titular.
- Re-sync parcial sem forçar janela completa de 24 meses.

## Comportamento (usuário)

1. Aba **Integrações** → portal Amil → **Sincronizar**.
2. Modal: intervalo de datas (default ~2 meses) + marca ótica opcional.
3. Progresso mostra sub-etapa **Atendimentos (utilização)**.

## Superfície técnica

| Tipo | Referência |
|------|------------|
| UI | `AmilSyncOptionsModal.tsx`, `IntegrationsTab.tsx` |
| API query | `amilMarcaOtica`, `amilUtilizationStart`, `amilUtilizationEnd` |
| Delta | `computeAmilUtilizationPeriod()` em `sync-delta.helper.ts` |
| Scraper | `marcaOticaFilter`, `fetch-utilizacao` em `amil-sync.scraper.ts` |
| Perfil sync | `fetch-utilizacao` em `sync-portal-profile.ts` (api + web) |

## Fora de escopo

- Seletor visual de lista de beneficiários (hoje texto livre marca ótica).
- Sync silencioso na Carteira com filtro (usa janela incremental padrão).

## Ajuda relacionada

- [`docs/help/sincronizar-amil.md`](../help/sincronizar-amil.md)

## Ver também

- [`docs/SYNC_DELTA.md`](../SYNC_DELTA.md)
