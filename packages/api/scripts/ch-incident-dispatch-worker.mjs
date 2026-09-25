import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import { createIncidentDispatchService } from '../src/application/ops/incident-dispatch.service.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const dispatch = createIncidentDispatchService(pool)

const once = process.argv.includes('--once')
const intervalMs = Number(process.env.CH_INCIDENT_DISPATCH_INTERVAL_MS ?? '30000')

async function tick() {
  const result = await dispatch.runWorkerTick(20, 50)
  console.log('[ch-incident-dispatch]', JSON.stringify(result))
}

if (once) {
  await tick()
  await pool.end()
  process.exit(0)
}

console.log(`[ch-incident-dispatch] polling every ${intervalMs}ms`)
await tick()
const timer = setInterval(() => {
  tick().catch((err) => {
    console.error('[ch-incident-dispatch] tick failed', err instanceof Error ? err.message : err)
  })
}, intervalMs)
timer.unref()
