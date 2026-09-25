import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import { createIncidentDispatchService } from '../src/application/ops/incident-dispatch.service.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : 500
const resetDead = process.argv.includes('--reset-dead')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const dispatch = createIncidentDispatchService(pool)

try {
  if (resetDead) {
    const dead = await dispatch.resetEligibleDeadOutbox(limit)
    console.log('[ch-incident-dispatch-backfill] reset-dead', JSON.stringify(dead))
  }
  const result = await dispatch.backfillOpenIncidents(limit)
  console.log('[ch-incident-dispatch-backfill] backfill', JSON.stringify(result))
} finally {
  await pool.end()
}
