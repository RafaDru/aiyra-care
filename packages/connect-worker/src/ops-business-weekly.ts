import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import type pg from 'pg'

async function maybePostWebhook(markdown: string): Promise<void> {
  const url = process.env.OPS_WEEKLY_REPORT_WEBHOOK_URL?.trim()
  if (!url) return

  const preview = markdown.split('\n').slice(0, 24).join('\n')
  const body = {
    text: 'AiyraCare — relatório semanal de negócio',
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: preview },
      },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Webhook HTTP ${res.status}`)
  }
}

export type OpsBusinessWeeklyReportResult = {
  outPath: string
  generatedAt: string
}

/** Relatório semanal de negócio (markdown, sem PHI). */
export async function runOpsBusinessWeeklyReport(
  pool: pg.Pool,
  monorepoRoot: string,
): Promise<OpsBusinessWeeklyReportResult> {
  const { OpsMetricsService } = await import('../../api/src/application/ops/ops-metrics.service.js')
  const { OpsMetricsPgRepository } = await import(
    '../../api/src/infrastructure/persistence/ops-metrics.pg.repository.js'
  )
  const { LlmInternalCostService } = await import(
    '../../api/src/application/llm/llm-internal-cost.service.js'
  )
  const { LlmUsagePgRepository } = await import(
    '../../api/src/infrastructure/persistence/llm-usage.pg.repository.js'
  )
  const { LlmInternalBudgetPgRepository } = await import(
    '../../api/src/infrastructure/persistence/llm-internal-budget.pg.repository.js'
  )
  const { buildBusinessWeeklyReportMarkdown } = await import(
    '../../api/src/domain/ops/business-weekly-report.js'
  )

  const service = new OpsMetricsService(
    new OpsMetricsPgRepository(pool),
    new LlmInternalCostService(
      new LlmUsagePgRepository(pool),
      new LlmInternalBudgetPgRepository(pool),
    ),
  )
  const { metrics } = await service.getMetrics()
  const markdown = buildBusinessWeeklyReportMarkdown(metrics.business, metrics.generatedAt)

  const outDirRaw = process.env.OPS_BUSINESS_WEEKLY_OUT_DIR?.trim()
  const outDir = outDirRaw ? resolve(outDirRaw) : resolve(monorepoRoot, 'docs/ops/reports')
  mkdirSync(outDir, { recursive: true })
  const day = new Date().toISOString().slice(0, 10)
  const outPath = resolve(outDir, `business-weekly-${day}.md`)
  writeFileSync(outPath, markdown, 'utf8')

  await maybePostWebhook(markdown)

  return { outPath, generatedAt: metrics.generatedAt }
}
