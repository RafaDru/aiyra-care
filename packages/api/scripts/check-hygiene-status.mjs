import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const status = await pool.query(`
  SELECT status, entity_type, COUNT(*)::int AS n
  FROM hygiene_candidates
  GROUP BY status, entity_type
  ORDER BY status, entity_type
`)

const pending = await pool.query(`
  SELECT hc.id, hc.status, hc.entity_type, hc.detector, hc.score,
         p.name AS patient_name,
         hc.evidence, hc.resolved_at, hc.created_at
  FROM hygiene_candidates hc
  JOIN patients p ON p.id = hc.patient_id
  WHERE hc.status = 'pending'
  ORDER BY hc.score DESC, p.name
  LIMIT 25
`)

const resolvedRecent = await pool.query(`
  SELECT hc.id, hc.status, hc.entity_type, hc.entity_id_a, hc.entity_id_b,
         p.name AS patient_name, hc.evidence, hc.resolved_at
  FROM hygiene_candidates hc
  JOIN patients p ON p.id = hc.patient_id
  WHERE hc.status != 'pending'
  ORDER BY hc.resolved_at DESC NULLS LAST
  LIMIT 15
`)

const vaccineDupNotes = await pool.query(`
  SELECT p.name, v.vaccine_name, v.application_date::date AS date, v.source,
         CASE WHEN v.notes LIKE '%hygieneCanonicalId%' THEN true ELSE false END AS marked_duplicate
  FROM vaccines v
  JOIN patients p ON p.id = v.patient_id
  WHERE v.notes IS NOT NULL AND v.notes != ''
    AND (v.notes LIKE '%hygieneCanonicalId%' OR v.notes LIKE '%"hygiene"%')
  ORDER BY p.name, v.application_date DESC
  LIMIT 20
`)

console.log('=== STATUS COUNTS ===')
console.table(status.rows)
console.log('pending_total:', pending.rows.length, '(showing up to 25)')
console.log(JSON.stringify(pending.rows, null, 2))
console.log('=== RECENTLY RESOLVED ===')
console.log(JSON.stringify(resolvedRecent.rows, null, 2))
console.log('=== VACCINES MARKED DUPLICATE ===')
console.log(JSON.stringify(vaccineDupNotes.rows, null, 2))

await pool.end()
