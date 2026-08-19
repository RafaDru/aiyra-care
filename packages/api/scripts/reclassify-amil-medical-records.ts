/**
 * Job: re-mapeamento de atendimentos Amil que foram armazenados como
 * `medical_records` (consulta) mas que pela classificação seriam `exams`.
 *
 * Reutiliza o mesmo motor da integração (AmilLabelClassifier + FuzzyExamCatalogLookup),
 * garantindo consistência entre tempo-de-integração e jobs de otimização.
 *
 * Usage:
 *   npx tsx packages/api/scripts/reclassify-amil-medical-records.ts            # dry-run (relatório)
 *   npx tsx packages/api/scripts/reclassify-amil-medical-records.ts --apply    # cria os exams
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { AmilLabelClassifier } from '../src/application/classification/amil-label-classifier.js'
import { FuzzyExamCatalogLookup } from '../src/infrastructure/classification/fuzzy-exam-catalog-lookup.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const apply = process.argv.includes('--apply')
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const classifier = new AmilLabelClassifier({ lookup: new FuzzyExamCatalogLookup() })

type Row = {
  id: string
  patient_id: string
  record_date: string | null
  description: string | null
  source: string
}

const { rows } = await pool.query<Row>(
  `SELECT id, patient_id, record_date, description, source
     FROM medical_records
    WHERE source = 'amil'
      AND description IS NOT NULL
 ORDER BY patient_id, record_date`,
)

let wouldMove = 0
let created = 0
let skippedExisting = 0
const byPatient = new Map<string, { description: string; date: string | null; id: string }[]>()

for (const r of rows) {
  const c = classifier.classifySync(r.description ?? '')
  if (c.destination !== 'exam') continue

  const move = { id: r.id, description: r.description!, date: r.record_date }
  byPatient.set(r.patient_id, [...(byPatient.get(r.patient_id) ?? []), move])
  wouldMove++
  console.log(
    `  -> [exam] '${r.description}' (${r.record_date ?? '-'}) method=${c.method} conf=${c.confidence.toFixed(2)} ${c.catalogId ? 'cat=' + c.catalogId : ''} ${c.canonicalName ? 'as=' + c.canonicalName : ''}`,
  )
}

console.log(`\nTotal medical_records Amil: ${rows.length}; candidatos a exame: ${wouldMove}`)

if (apply) {
  for (const [patientId, moves] of byPatient) {
    const examRes = await pool.query<{ id: string; exam_type: string }>(
      `SELECT id, exam_type, exam_date FROM exams WHERE patient_id = $1`,
      [patientId],
    )
    const existingKeys = new Set(
      examRes.rows.map((e) => `${e.exam_type}|${(e as unknown as { exam_date: string }).exam_date}`),
    )
    for (const m of moves) {
      const examType = m.description
      const examDateKey = m.date ? String(m.date).slice(0, 10) : null
      if (!examDateKey) {
        console.log(`  skip (sem data): '${examType}'`)
        continue
      }
      if (existingKeys.has(`${examType}|${examDateKey}`)) {
        skippedExisting++
        continue
      }
      const ins = await pool.query(
        `INSERT INTO exams (patient_id, exam_type, exam_date, source, created_at)
         VALUES ($1, $2, $3, 'amil', now())
         ON CONFLICT DO NOTHING RETURNING id`,
        [patientId, examType, examDateKey],
      )
      if (ins.rows.length) {
        created++
        existingKeys.add(`${examType}|${examDateKey}`)
        console.log(`  created exam '${examType}' (${examDateKey}) for ${patientId}`)
      }
    }
  }
  console.log(`\nApplied: exams criados=${created}; já existentes=${skippedExisting}`)
} else {
  console.log('\n(dry-run) rode com --apply para criar os exams correspondentes.')
}

await pool.end()
