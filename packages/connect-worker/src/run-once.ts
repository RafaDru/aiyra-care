import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { runConnectWorkerBatch } from '../../api/src/infrastructure/sync/connect-worker.runner.js'

loadMonorepoEnv()

const pool = createWorkerPool()
const report = await runConnectWorkerBatch(pool)
console.log(JSON.stringify(report, null, 2))
await pool.end()
