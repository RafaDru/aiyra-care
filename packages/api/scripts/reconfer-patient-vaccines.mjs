import pg from 'pg'
import { conferVaccineRecord } from '../src/application/vaccine/vaccine-conference.service.ts'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const PARTICULAR_NOTE = 'Particular (fora do calendário SUS)'

const { rows: patients } = await pool.query(
  `SELECT id, birth_date FROM patients WHERE name ILIKE '%luis%'`,
)
const patient = patients[0]
if (!patient) {
  console.log('Patient not found')
  await pool.end()
  process.exit(0)
}

const birthDate = patient.birth_date instanceof Date
  ? patient.birth_date.toISOString().slice(0, 10)
  : String(patient.birth_date).slice(0, 10)

const { rows: vaccines } = await pool.query(
  `SELECT id, vaccine_name, dose_number, application_date, notes
   FROM vaccines WHERE patient_id = $1`,
  [patient.id],
)

for (const row of vaccines) {
  const appDate = row.application_date instanceof Date
    ? row.application_date.toISOString().slice(0, 10)
    : String(row.application_date).slice(0, 10)
  const conference = conferVaccineRecord({
    vaccineName: row.vaccine_name,
    doseNumber: row.dose_number,
    applicationDate: appDate,
    birthDate,
  })
  const isDengue = conference.catalogId === 'dengue'
  const notes = isDengue ? PARTICULAR_NOTE : row.notes
  await pool.query(
    `UPDATE vaccines SET
       vaccine_name = $2,
       dose_number = $3,
       catalog_slot_key = $4,
       notes = $5
     WHERE id = $1`,
    [
      row.id,
      conference.displayName,
      conference.doseNumber,
      conference.catalogSlotKey,
      notes,
    ],
  )
  if (conference.catalogSlotKey) {
    console.log(`vaccine ${row.vaccine_name} -> ${conference.displayName} ${conference.catalogSlotKey}`)
  }
}

const { rows: schedule } = await pool.query(
  `SELECT id, vaccine_name, dose_number, dose_label, application_date
   FROM vaccine_schedule_items WHERE patient_id = $1`,
  [patient.id],
)

for (const row of schedule) {
  const appDate = row.application_date
    ? (row.application_date instanceof Date
      ? row.application_date.toISOString().slice(0, 10)
      : String(row.application_date).slice(0, 10))
    : null
  const conference = conferVaccineRecord({
    vaccineName: row.vaccine_name,
    doseLabel: row.dose_label,
    doseNumber: row.dose_number,
    applicationDate: appDate,
    birthDate,
  })
  await pool.query(
    `UPDATE vaccine_schedule_items SET
       vaccine_name = $2,
       dose_number = $3,
       catalog_slot_key = $4,
       match_method = $5,
       match_score = $6
     WHERE id = $1`,
    [
      row.id,
      conference.displayName,
      conference.doseNumber,
      conference.catalogSlotKey,
      conference.method,
      conference.score,
    ],
  )
  if (conference.catalogSlotKey) {
    console.log(`schedule ${row.vaccine_name} -> ${conference.displayName} ${conference.catalogSlotKey}`)
  }
}

console.log('Done')
await pool.end()
