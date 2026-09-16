import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

try {
  const sqlPath = resolve(root, 'database/relational/044_semantic_catalog_cache.sql')
  const sql = readFileSync(sqlPath, 'utf-8')
  console.log('Applying migration 044_semantic_catalog_cache.sql...')
  await pool.query(sql)
  console.log('Migration 044 applied successfully!')
} catch (err) {
  console.error('Error applying migration 044:', err)
  process.exit(1)
} finally {
  await pool.end()
}
