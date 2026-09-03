import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, readdirSync } from 'fs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

async function apply() {
  const dir = resolve(root, 'database/relational')
  const file = readdirSync(dir).find((f) => f.startsWith('047_'))
  if (!file) {
    console.error('Migration 047 não encontrada')
    process.exit(1)
  }
  const sql = readFileSync(resolve(dir, file), 'utf-8')
  console.log(`Aplicando ${file}...`)
  await pool.query(sql)
  console.log('✅ Migration 047 aplicada com sucesso')
  await pool.end()
}

apply().catch(async (err) => {
  console.error('❌ Erro:', err.message)
  await pool.end()
  process.exit(1)
})
