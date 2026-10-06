import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const sql = readFileSync(
  resolve(root, 'database/relational/086_platform_defect_ci_pipeline.sql'),
  'utf8',
)

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

await pool.query(sql)
await pool.end()
console.log('086_platform_defect_ci_pipeline applied')
