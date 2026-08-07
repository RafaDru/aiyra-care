import pg from 'pg'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('../../.env', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const pool = new pg.Pool({ connectionString: env.DATABASE_URL || 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth' })

const bruno = await pool.query(`SELECT id, name FROM patients WHERE name ILIKE '%bruno%'`)
console.log('Bruno:', bruno.rows[0])

if (bruno.rows[0]) {
  const id = bruno.rows[0].id
  const exams = await pool.query(`SELECT id, exam_type, exam_date, laboratory, result_summary, source, notes FROM exams WHERE patient_id=$1 ORDER BY exam_date DESC`, [id])
  console.log('Exams:', exams.rows.length)
  for (const e of exams.rows) console.log('-', e.exam_date?.toISOString?.().slice(0,10), e.exam_type, e.source, e.laboratory)

  const docs = await pool.query(`SELECT id, title, document_type, file_url, source FROM documents WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 10`, [id])
  console.log('Documents:', docs.rows.length)
  for (const d of docs.rows) console.log('-', d.document_type, d.title, d.source)

  const records = await pool.query(`SELECT id, record_date, record_type, description, source, clinic_name FROM medical_records WHERE patient_id=$1 ORDER BY record_date DESC LIMIT 10`, [id])
  console.log('Records:', records.rows.length)
  for (const r of records.rows) console.log('-', r.record_date?.toISOString?.().slice(0,10), r.record_type, r.description, r.source)
}

const links = await pool.query(`SELECT portal_type, patient_id, last_sync_at FROM integration_links WHERE portal_type='mater_dei'`)
console.log('Mater Dei links:', links.rows)

await pool.end()
