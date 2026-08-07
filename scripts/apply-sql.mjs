/**
 * Aplica um arquivo SQL usando DATABASE_URL ou SUPABASE_DATABASE_URL.
 * Uso: node scripts/apply-sql.mjs path/to/file.sql [--cloud]
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = resolve(__dirname, '../.env')
if (existsSync(rootEnv)) config({ path: rootEnv })

const require = createRequire(resolve(__dirname, '../packages/api/package.json'))
const pg = require('pg')

const file = process.argv[2]
const useCloud = process.argv.includes('--cloud')
if (!file) {
  console.error('Usage: node scripts/apply-sql.mjs <sql-file> [--cloud]')
  process.exit(1)
}

const url = useCloud
  ? process.env.SUPABASE_DATABASE_URL
  : process.env.DATABASE_URL

if (!url) {
  console.error(useCloud ? 'SUPABASE_DATABASE_URL missing' : 'DATABASE_URL missing')
  process.exit(1)
}

const sql = readFileSync(resolve(file), 'utf8')
const pool = new pg.Pool({ connectionString: url })
try {
  await pool.query(sql)
  console.log(`Applied ${file} (${useCloud ? 'cloud' : 'local'})`)
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
} finally {
  await pool.end()
}
