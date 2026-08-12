import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(root, '.env') })

const { IntegrationLinkSyncService } = await import('../src/application/integration-link/integration-link-sync.service.js')
const { IntegrationLinkPgRepository } = await import('../src/infrastructure/persistence/integration-link.pg.repository.js')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

  const linkRepo = new IntegrationLinkPgRepository(pool)
  const syncService = new IntegrationLinkSyncService(pool, linkRepo)

console.log('Running scheduled integration sync batch...')
const report = await syncService.runScheduledBatch()
console.log(JSON.stringify(report, null, 2))

await pool.end()
