import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { conferVaccineRecord } from '../src/application/vaccine/vaccine-conference.service.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const pid = 'f3cc72fd-f11c-419e-ac82-3ae45bd313ce'
const CANONICAL = 'fe9038d6-18b4-4c0f-9a26-4318e96b23b7'
const REMOVE = [
  'e2df240c-d06f-45e7-bc0b-40d8930c06a0', // manual dup
  '3083e4df-762c-482d-8bc6-ed6558385b92', // conectesus dup
]

const { rows: patients } = await pool.query(`SELECT birth_date FROM patients WHERE id = $1`, [pid])
const birthDate = patients[0]?.birth_date
  ? new Date(patients[0].birth_date).toISOString().slice(0, 10)
  : null

for (const id of REMOVE) {
  await pool.query(`DELETE FROM vaccines WHERE id = $1 AND patient_id = $2`, [id, pid])
  console.log(`Deleted vaccine ${id}`)
}

const { rows: kept } = await pool.query(`SELECT * FROM vaccines WHERE id = $1`, [CANONICAL])
const row = kept[0]
if (!row) throw new Error('Canonical vaccine not found')

const appDate = new Date(row.application_date).toISOString().slice(0, 10)
const conference = conferVaccineRecord({
  vaccineName: row.vaccine_name,
  doseLabel: '1ª Dose',
  doseNumber: 1,
  applicationDate: appDate,
  birthDate,
})

await pool.query(
  `UPDATE vaccines SET
     vaccine_name = $2,
     dose_number = $3,
     catalog_slot_key = $4
   WHERE id = $1`,
  [CANONICAL, conference.displayName, conference.doseNumber, conference.catalogSlotKey],
)

console.log('Canonical updated:', {
  id: CANONICAL,
  source: row.source,
  applicationDate: appDate,
  conference,
})

const { rows: remaining } = await pool.query(
  `SELECT id, vaccine_name, dose_number, application_date, source, catalog_slot_key
   FROM vaccines WHERE patient_id = $1 AND vaccine_name ILIKE '%dengue%'`,
  [pid],
)
console.log('Remaining dengue vaccines:', remaining)

await pool.end()
