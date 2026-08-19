import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

console.log('=== Registros da Unimed com Thamires como médica ===')
const records = await pool.query(
  `SELECT mr.id, p.name AS patient_name, mr.record_type, mr.description, mr.record_date, mr.doctor_name
     FROM medical_records mr JOIN patients p ON p.id = mr.patient_id
    WHERE mr.source = 'unimed' AND mr.doctor_name ILIKE '%Thamires%'
    ORDER BY mr.record_date DESC`,
)

if (records.rows.length === 0) {
  console.log('Nenhum registro da Unimed com Thamires como médica encontrado.')
} else {
  for (const r of records.rows) {
    console.log(`  ${r.patient_name} | ${r.record_date.toISOString().slice(0, 10)} | ${r.record_type} | ${r.description} | Dr. ${r.doctor_name}`)
  }
}

await pool.end()
