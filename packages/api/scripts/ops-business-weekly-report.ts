/**
 * Relatório semanal de negócio (markdown, sem PHI).
 * Uso: npm run ops:business-weekly
 * Opcional: OPS_WEEKLY_REPORT_WEBHOOK_URL (Slack-compatible) envia resumo.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import { OpsMetricsService } from '../src/application/ops/ops-metrics.service.js'
import { OpsMetricsPgRepository } from '../src/infrastructure/persistence/ops-metrics.pg.repository.js'
import { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'
import { LlmUsagePgRepository } from '../src/infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../src/infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { buildBusinessWeeklyReportMarkdown } from '../src/domain/ops/business-weekly-report.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

async function maybePostWebhook(markdown: string) {
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

async function main() {
  const service = new OpsMetricsService(
    new OpsMetricsPgRepository(pool),
    new LlmInternalCostService(
      new LlmUsagePgRepository(pool),
      new LlmInternalBudgetPgRepository(pool),
    ),
  )
  const { metrics } = await service.getMetrics()
  const markdown = buildBusinessWeeklyReportMarkdown(metrics.business, metrics.generatedAt)

  const outDir = resolve(root, 'docs/ops/reports')
  mkdirSync(outDir, { recursive: true })
  const day = new Date().toISOString().slice(0, 10)
  const outPath = resolve(outDir, `business-weekly-${day}.md`)
  writeFileSync(outPath, markdown, 'utf8')

  console.log(markdown)
  console.log('')
  console.log(`Salvo em ${outPath}`)

  await maybePostWebhook(markdown)
  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
