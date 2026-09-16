/**
 * Sondas sintéticas: latência API /health, PG SELECT 1, Neo4j (opcional).
 * Uso: npm run ops:probe
 */
import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { runOpsProbe, isOpsProbeDegraded } from '../src/application/ops/ops-probe.service.js'
import { OPS_PROBE_ARTIFACT_PATH } from '../src/application/ops/ops-probe-artifact.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

async function main() {
  const snapshot = await runOpsProbe(pool)
  console.log(JSON.stringify(snapshot, null, 2))
  console.log(`artifact: ${OPS_PROBE_ARTIFACT_PATH}`)
  console.log(`degraded: ${isOpsProbeDegraded(snapshot)}`)
  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
