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
  const sqlPath = resolve(root, 'database/relational/045_exam_result_items.sql')
  const sql = readFileSync(sqlPath, 'utf-8')
  console.log('Applying migration 045_exam_result_items.sql...')
  await pool.query(sql)
  console.log('Migration 045 applied successfully!')
} catch (err) {
  console.error('Error applying migration 045:', err)
  process.exit(1)
} finally {
  await pool.end()
}
