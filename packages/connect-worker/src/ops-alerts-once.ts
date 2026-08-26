import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { runOpsAlertsCheck } from './ops-alerts.js'

loadMonorepoEnv()

const pool = createWorkerPool()
const result = await runOpsAlertsCheck(pool)
console.log(JSON.stringify(result, null, 2))
await pool.end()
