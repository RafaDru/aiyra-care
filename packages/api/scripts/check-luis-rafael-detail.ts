import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

// Luís: documentos e preview do texto
const { rows: luisDocs } = await pool.query<{ original_filename: string; extracted_text: string | null }>(
  `SELECT d.original_filename, d.extracted_text
     FROM documents d JOIN patients p ON p.id = d.patient_id
    WHERE p.name ILIKE '%Luis%' OR p.name ILIKE '%Luís%'`,
)
console.log('=== LUÍS: DOCUMENTOS ===')
for (const d of luisDocs) {
  console.log(`\n📄 ${d.original_filename} (${d.extracted_text?.length ?? 0} chars)`)
  console.log((d.extracted_text ?? '').slice(0, 600))
}

// Luís: exames e seus result_summary
const { rows: luisExams } = await pool.query<{ name: string; exam_date: Date; result_summary: string | null }>(
  `SELECT name, exam_date, result_summary FROM exams e JOIN patients p ON p.id = e.patient_id
    WHERE p.name ILIKE '%Luis%' OR p.name ILIKE '%Luís%' ORDER BY exam_date DESC`,
)
console.log('\n=== LUÍS: EXAMES ===')
for (const e of luisExams) {
  console.log(`• ${new Date(e.exam_date).toISOString().slice(0, 10)} | ${e.name} | summary: ${(e.result_summary ?? '(vazio)').slice(0, 80)}`)
}

// Rafael: exames vs marcadores (cobertura)
const { rows: rafaelExams } = await pool.query<{ id: string; exam_date: Date; has_markers: number }>(
  `SELECT e.id, e.exam_date,
          (SELECT COUNT(*)::int FROM exam_result_items eri WHERE eri.exam_id = e.id) AS has_markers
     FROM exams e JOIN patients p ON p.id = e.patient_id
    WHERE p.name ILIKE '%Rafael%' ORDER BY e.exam_date DESC`,
)
console.log('\n=== RAFAEL: COBERTURA EXAMES × MARCADORES ===')
for (const e of rafaelExams) {
  console.log(`• ${new Date(e.exam_date).toISOString().slice(0, 10)} | ${e.id.slice(0, 8)} | ${e.has_markers} marcador(es)`)
}

await pool.end()