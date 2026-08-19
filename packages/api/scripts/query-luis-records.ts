import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const luisIdRes = await pool.query(`SELECT id FROM patients WHERE name ILIKE '%Luis Drummond Freitas Reis%' LIMIT 1`)
const luisId = luisIdRes.rows[0]?.id

if (!luisId) {
  console.log('Paciente Luís Drummond Freitas Reis não encontrado.')
  await pool.end()
  process.exit(0)
}

console.log('=== medical_records do Luis (source: amil, tipo: exame) ===')
const medicalRecords = await pool.query(
  `SELECT mr.id, mr.record_type, mr.description, mr.record_date
     FROM medical_records mr
    WHERE mr.patient_id = $1 AND mr.source = 'amil' AND mr.record_type = 'exame'
    ORDER BY mr.record_date DESC`,
  [luisId],
)
if (medicalRecords.rows.length === 0) {
  console.log('Nenhum medical_record tipo exame encontrado para o Luis (source amil).')
} else {
  for (const r of medicalRecords.rows) {
    console.log(`  ${r.record_date.toISOString().slice(0, 10)} | ${r.record_type} | ${r.description}`)
  }
}

console.log('\n=== exams do Luis (source: amil) ===')
const exams = await pool.query(
  `SELECT e.id, e.exam_type, e.exam_date, e.laboratory
     FROM exams e
    WHERE e.patient_id = $1 AND e.source = 'amil'
    ORDER BY e.exam_date DESC`,
  [luisId],
)
if (exams.rows.length === 0) {
  console.log('Nenhum exam encontrado para o Luis (source amil).')
} else {
  for (const r of exams.rows) {
    console.log(`  ${r.exam_date.toISOString().slice(0, 10)} | ${r.exam_type} | ${r.laboratory}`)
  }
}

await pool.end()
