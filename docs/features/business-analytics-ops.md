# Analytics de negócio (console ops)

| Campo | Valor |
|-------|--------|
| **ID** | `business-analytics-ops` |
| **Épico** | `business-analytics` |
| **Status** | `done` |
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

## Guardrails LGPD

- **Finalidade:** operação interna — funis de ativação, retenção, billing e saúde de integrações sem identificar titulares na UI.
- **Minimização:** apenas agregados (`COUNT`, `AVG`, percentuais); sem nomes, CPF, descrições de chamados ou conteúdo clínico.
- **Fontes:** `product_events`, `support_reports` (status/categoria), `sync_jobs`, `billing_*` — ver [`DATA_PROCESSING_MAP.md`](../legal/DATA_PROCESSING_MAP.md).
- **Retenção:** mesma política das tabelas-fonte; relatório semanal markdown em `docs/ops/reports/` (interno).
- **Novas métricas:** exigem revisão jurídica (`reviewBadge: legal`) antes de expor no console ou webhook.

## QA

- API: `packages/api/tests/ops-business-analytics.test.ts`, `business-weekly-report.test.ts`
- UI ops: validação manual na aba Negócio (`:3013`)

## Relacionado

- Aba **Estratégia** (advisory markdown): [`ops-strategy-advisory.md`](./ops-strategy-advisory.md)

## Agendamento

| Modo | Como |
|------|------|
| Script raiz | `npm run ops:business-weekly` (`packages/api`) |
| Worker loop | `OPS_BUSINESS_WEEKLY_INTERVAL_MS=604800000` + `npm run connect-worker` |
| One-shot | `cd packages/connect-worker && npm run ops-business-weekly:once` |
| Cloud Run Job | `CONNECT_WORKER_JOB_MODE=business-weekly npm run job` (scheduler sugerido: segunda 09:00 UTC) |

Detalhe: [`docs/ops/README.md`](../ops/README.md#relatório-semanal-de-negócio-agendamento).
