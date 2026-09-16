import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const { rows } = await pool.query(`
  SELECT p.name, e.id, e.source, LEFT(e.exam_type, 50) AS type,
         e.exam_date::date AS date, e.result_summary,
         CASE WHEN e.notes LIKE '%hygieneCanonicalId%' THEN true ELSE false END AS is_duplicate
  FROM exams e
  JOIN patients p ON p.id = e.patient_id
  WHERE (e.exam_type LIKE '%SARS Coronav%' OR e.exam_type LIKE 'RX TORAX%')
  ORDER BY p.name, e.exam_date
`)

console.log(JSON.stringify(rows, null, 2))

const pending = await pool.query(`SELECT COUNT(*)::int AS n FROM hygiene_candidates WHERE status = 'pending'`)
console.log('pending:', pending.rows[0].n)

await pool.end()
