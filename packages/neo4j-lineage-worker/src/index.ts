import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { runNeo4jLineageBatch } from '../../api/src/infrastructure/sync/neo4j-lineage.runner.js'

loadMonorepoEnv()

const intervalMs = Number(process.env.NEO4J_LINEAGE_INTERVAL_MS ?? '300000')
const pool = createWorkerPool()

async function tick() {
  const report = await runNeo4jLineageBatch(pool)
  if (report.processed > 0) {
    console.log('[neo4j-lineage-worker] projected', report)
  }
}

console.log(`[neo4j-lineage-worker] loop every ${intervalMs}ms (NEO4J_SYNC_ENABLED required)`)

void tick()
const timer = setInterval(() => void tick(), intervalMs)

async function shutdown(signal: string) {
  console.log(`[neo4j-lineage-worker] ${signal} — stopping`)
  clearInterval(timer)
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
