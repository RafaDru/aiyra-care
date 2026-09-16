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
  SELECT hc.id, hc.patient_id, hc.detector, hc.score, hc.status,
         hc.entity_id_a, hc.entity_id_b, hc.evidence,
         p.name AS patient_name,
         ea.exam_type AS type_a, ea.exam_date AS date_a, ea.laboratory AS lab_a, ea.source AS source_a,
         LEFT(ea.result_summary, 120) AS summary_a, ea.notes AS notes_a,
         eb.exam_type AS type_b, eb.exam_date AS date_b, eb.laboratory AS lab_b, eb.source AS source_b,
         LEFT(eb.result_summary, 120) AS summary_b, eb.notes AS notes_b
  FROM hygiene_candidates hc
  JOIN patients p ON p.id = hc.patient_id
  JOIN exams ea ON ea.id = hc.entity_id_a
  JOIN exams eb ON eb.id = hc.entity_id_b
  WHERE hc.entity_type = 'exam'
  ORDER BY hc.score DESC, p.name, hc.created_at DESC
`)

console.log(JSON.stringify(rows, null, 2))
await pool.end()
