/**
 * Correlaciona docs/dev-audit/ (hooks Cursor) com product_events no PG.
 * Uso: npm run dev-audit:bridge
 * Env: DATABASE_URL, DEV_AUDIT_BRIDGE_HOURS (default 24)
 */
import pg from 'pg'
import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  DevAuditBridgeService,
  defaultDevAuditRoot,
} from '../src/application/ops/dev-audit-bridge.service.js'
import { DevAuditBridgePgRepository } from '../src/infrastructure/persistence/dev-audit-bridge.pg.repository.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })
config({ path: resolve(root, '.env.preview') })

const hours = Number(process.env.DEV_AUDIT_BRIDGE_HOURS ?? '24')
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

async function main() {
  const service = new DevAuditBridgeService(
    new DevAuditBridgePgRepository(pool),
    defaultDevAuditRoot(root),
  )
  const report = await service.buildReport(hours)

  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), 'output')
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, 'dev-audit-bridge-last.json')
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log('=== dev-audit bridge ===')
  console.log(`tier=${report.deploymentTier} window=${report.windowHours}h`)
  console.log(`audit events=${report.audit.totalEvents} sessions=${report.audit.sessions}`)
  console.log(`product_events=${report.productEvents.total}`)
  console.log(`aligned hours=${report.correlation.alignedHours}`)
  console.log('')
  for (const hint of report.hints) console.log(`• ${hint}`)
  console.log('')
  console.log(`Written: ${outPath}`)

  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
