import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { runNeo4jLineageBatch } from '../../api/src/infrastructure/sync/neo4j-lineage.runner.js'

loadMonorepoEnv()
const pool = createWorkerPool()

const patientId = process.argv[2]
const report = await runNeo4jLineageBatch(pool, { backfill: true, patientId })
console.log('[neo4j-lineage-worker] backfill', report)
await pool.end()
