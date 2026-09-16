import pg from 'pg'
import { config } from 'dotenv'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const dir = resolve(root, 'database/relational')
const file = readdirSync(dir).find((f) => f.startsWith('055_'))
if (!file) {
  console.error('Migration 055 não encontrada')
  process.exit(1)
}

await pool.query(readFileSync(resolve(dir, file), 'utf8'))
console.log(`✅ ${file}`)
await pool.end()
