/**
 * Aplica todas as migrations numeradas em database/relational (ordem NNN).
 * Uso: PG vazio (CI) ou dev local. Não usar em prod sem backup.
 */
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const dir = resolve(root, 'database/relational')
const files = readdirSync(dir)
  .filter((f) => /^\d{3}_/.test(f) && f.endsWith('.sql'))
  .sort()

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

for (const file of files) {
  const sql = readFileSync(resolve(dir, file), 'utf8')
  process.stdout.write(`apply ${file}...`)
  try {
    await pool.query(sql)
    console.log(' OK')
  } catch (err) {
    console.log(' SKIP/ERR')
    console.error(`  ${err.message}`)
    if (!process.argv.includes('--continue-on-error')) {
      await pool.end()
      process.exit(1)
    }
  }
}

console.log(`done (${files.length} files)`)
await pool.end()
