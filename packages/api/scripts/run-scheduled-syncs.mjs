import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(root, '.env') })

const { runConnectWorkerBatch } = await import('../src/infrastructure/sync/connect-worker.runner.js')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

console.log('Running scheduled integration sync batch...')
const report = await runConnectWorkerBatch(pool)
console.log(JSON.stringify(report, null, 2))

await pool.end()
