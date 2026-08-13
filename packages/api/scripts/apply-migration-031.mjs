import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const sql = readFileSync(resolve(root, 'database/relational/031_legal_compliance.sql'), 'utf8')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
await pool.query(sql)
console.log('031_legal_compliance applied')
await pool.end()
