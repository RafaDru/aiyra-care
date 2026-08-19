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

const vaccines = await pool.query(
  `SELECT id, vaccine_name, dose_number, application_date, source, vaccine_code, catalog_slot_key, notes, created_at
   FROM vaccines WHERE patient_id = $1 AND vaccine_name ILIKE '%dengue%'
   ORDER BY application_date, dose_number, created_at`,
  [pid],
)

const schedule = await pool.query(
  `SELECT id, vaccine_name, dose_number, dose_label, expected_age_months, application_date, status, source, external_key, catalog_slot_key, match_method
   FROM vaccine_schedule_items WHERE patient_id = $1 AND vaccine_name ILIKE '%dengue%'
   ORDER BY dose_number, application_date`,
  [pid],
)

console.log('=== vaccines ===')
console.log(JSON.stringify(vaccines.rows, null, 2))
console.log('=== vaccine_schedule_items ===')
console.log(JSON.stringify(schedule.rows, null, 2))

await pool.end()
