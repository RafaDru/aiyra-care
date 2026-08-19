import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const pid = 'f3cc72fd-f11c-419e-ac82-3ae45bd313ce'

const { rows } = await pool.query(
  `SELECT id, exam_type, exam_date::date, source, result_summary,
          CASE WHEN notes LIKE '%hygieneCanonicalId%' THEN true ELSE false END AS is_dup,
          LEFT(notes, 80) AS notes_preview
   FROM exams
   WHERE patient_id = $1
     AND exam_date::date = '2021-04-11'
     AND (exam_type ILIKE '%sars%' OR exam_type ILIKE '%covid%' OR exam_type ILIKE '%coronav%')
   ORDER BY source, created_at`,
  [pid],
)

console.log(JSON.stringify(rows, null, 2))
console.log('count:', rows.length)

await pool.end()
