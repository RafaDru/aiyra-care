import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const sql = readFileSync(resolve(root, 'database/relational/040_llm_usage.sql'), 'utf8')
await pool.query(sql)
console.log('040_llm_usage applied')
await pool.end()
