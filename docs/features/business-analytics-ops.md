# Analytics de negócio (console ops)

| Campo | Valor |
|-------|--------|
| **ID** | `business-analytics-ops` |
| **Épico** | `business-analytics` |
| **Status** | `in_progress` |
| **Categoria** | negócio |
| **Prioridade** | P2 |

## Resumo

KPIs agregados sem PHI no console ops (aba **Negócio**) e relatório semanal em markdown para operação interna.

## Superfície técnica

| Tipo | Referência |
|------|------------|
| API | `GET /ops/metrics` → `metrics.business` |
| Console | `packages/ops-console/src/client/BusinessPanel.tsx` |
| Script | `npm run ops:business-weekly` |
| Domínio | `packages/api/src/domain/ops/business-weekly-report.ts` |

## Métricas (MVP)

- Ativação: contas → paciente → link → sync 7d
- Engajamento: WAU/MAU, inativos 30d
- Suporte: volume, SLA, categorias
- Billing: checkout, planos pagos, receita 30d
- Integrações: jobs 7d por portal

## QA

- API: `packages/api/tests/ops-business-analytics.test.ts`, `business-weekly-report.test.ts`
- UI ops: validação manual na aba Negócio (`:3013`)

## Próximo

- Relatório semanal agendado (connect-worker ou cron GCP)
