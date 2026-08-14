import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const sql = readFileSync(resolve(root, 'database/relational/037_measurement_observations.sql'), 'utf8')
await pool.query(sql)
console.log('037_measurement_observations applied')

// Backfill growth_records → measurement_observations (legacy)
const { rows } = await pool.query(
  `SELECT id, patient_id, record_date, weight_kg, height_cm, head_circumference_cm, notes
   FROM growth_records`,
)
let inserted = 0
for (const row of rows) {
  const baseAt = row.record_date
  const ref = `growth_record:${row.id}`
  const pairs = [
    ['weight', row.weight_kg],
    ['height', row.height_cm],
    ['head_circumference', row.head_circumference_cm],
  ]
  for (const [code, val] of pairs) {
    if (val == null) continue
    const exists = await pool.query(
      `SELECT 1 FROM measurement_observations WHERE source_ref = $1 AND type_code = $2 LIMIT 1`,
      [ref, code],
    )
    if (exists.rowCount) continue
    await pool.query(
      `INSERT INTO measurement_observations
       (patient_id, type_code, observed_at, value_numeric, source, source_ref, notes)
       VALUES ($1, $2, $3, $4, 'legacy_growth', $5, $6)`,
      [row.patient_id, code, baseAt, val, ref, row.notes],
    )
    inserted++
  }
}
console.log(`Backfill growth_records: ${inserted} observations`)

await pool.end()
