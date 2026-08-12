import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { runNeo4jLineageBatch } from '../../api/src/infrastructure/sync/neo4j-lineage.runner.js'

loadMonorepoEnv()
const pool = createWorkerPool()

const report = await runNeo4jLineageBatch(pool)
console.log('[neo4j-lineage-worker] once', report)
await pool.end()
