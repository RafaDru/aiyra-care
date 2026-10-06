import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const sql = readFileSync(
  resolve(root, 'database/relational/087_client_error_incident_signal_occurrence.sql'),
  'utf8',
)

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

await pool.query(sql)
await pool.end()
console.log('087_client_error_incident_signal_occurrence applied')
