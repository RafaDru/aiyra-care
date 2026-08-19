import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const mr = await pool.query(
  `SELECT MIN(record_date)::date AS mn, MAX(record_date)::date AS mx, COUNT(*)::int AS n FROM medical_records WHERE source = 'amil'`,
)
console.log('medical_records amil:', mr.rows[0])

const ex = await pool.query(
  `SELECT MIN(exam_date)::date AS mn, MAX(exam_date)::date AS mx, COUNT(*)::int AS n FROM exams WHERE source = 'amil'`,
)
console.log('exams amil:', ex.rows[0])

await pool.end()
