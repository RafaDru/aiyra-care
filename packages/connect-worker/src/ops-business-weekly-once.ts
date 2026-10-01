import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { runOpsBusinessWeeklyReport } from './ops-business-weekly.js'

const root = loadMonorepoEnv()
const pool = createWorkerPool()

try {
  const result = await runOpsBusinessWeeklyReport(pool, root)
  console.log(JSON.stringify({ job: 'business-weekly', ...result }, null, 2))
} catch (err) {
  console.error('[connect-worker] business-weekly failed', err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await pool.end()
}
