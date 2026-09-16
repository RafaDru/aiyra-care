/**
 * Job: re-mapeamento de atendimentos Amil que foram armazenados como
 * `medical_records` (consulta) mas que pela classificação seriam `exams`.
 *
 * Reutiliza o mesmo motor da integração (AmilLabelClassifier + FuzzyExamCatalogLookup),
 * garantindo consistência entre tempo-de-integração e jobs de otimização. Com `--llm`,
 * os rótulos ambíguos passam pelo fallback LLM (custo INTERNO nosso, metrito e teto R$100/mês).
 *
 * Usage:
 *   npx tsx packages/api/scripts/reclassify-amil-medical-records.ts             # dry-run (regras/fuzzy)
 *   npx tsx packages/api/scripts/reclassify-amil-medical-records.ts --apply     # cria os exams (regras/fuzzy)
 *   npx tsx packages/api/scripts/reclassify-amil-medical-records.ts --llm       # dry-run + fallback LLM
 *   npx tsx packages/api/scripts/reclassify-amil-medical-records.ts --apply --llm
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { buildClassificationClassifier } from '../src/application/llm/llm-internal-cost.factory.js'
import { LlmUsagePgRepository } from '../src/infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../src/infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { LlmInternalCostService } from '../src/application/llm/llm-internal-cost.service.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const apply = process.argv.includes('--apply')
const useLlm = process.argv.includes('--llm')
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const classifier = buildClassificationClassifier(pool, {
  allowLlm: useLlm,
  trigger: 'reclassify-job',
})
const budgetService = new LlmInternalCostService(
  new LlmUsagePgRepository(pool),
  new LlmInternalBudgetPgRepository(pool),
)

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

const chunk = <T>(arr: T[], n: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

const moveByRecord = new Map<string, { id: string; patient_id: string; description: string; date: string | null }>()
let wouldMove = 0

for (const batch of chunk(rows, 40)) {
  const labels = batch.map((r) => r.description!)
  const results = await classifier.classifyBatch(labels)
  batch.forEach((r, i) => {
    const c = results[i]
    if (!c || c.destination !== 'exam') return
    wouldMove++
    moveByRecord.set(r.id, { id: r.id, patient_id: r.patient_id, description: r.description!, date: r.record_date })
    console.log(
      `  -> [exam] '${r.description}' (${r.record_date ?? '-'}) method=${c.method} conf=${c.confidence.toFixed(2)} ${c.catalogId ? 'cat=' + c.catalogId : ''} ${c.canonicalName ? 'as=' + c.canonicalName : ''}`,
    )
  })
}

const budget = await budgetService.getBudget()
console.log(`\nTotal medical_records Amil: ${rows.length}; candidatos a exame: ${wouldMove}`)
console.log(
  `LLM interno: ${useLlm ? 'ligado' : 'desligado (use --llm)'} | custo do mês R$ ${(budget.spentBrlCents / 100).toFixed(2)} / R$ ${(budget.monthlyBudgetBrlCents / 100).toFixed(2)}${budget.exhausted ? ' (TETO ESGOTADO)' : ''}`,
)

if (apply) {
  const byPatient = new Map<string, typeof moveByRecord extends Map<unknown, infer V> ? V[] : never>()
  for (const m of moveByRecord.values()) {
    byPatient.set(m.patient_id, [...(byPatient.get(m.patient_id) ?? []), m])
  }
  let created = 0
  let skippedExisting = 0
  for (const [patientId, moves] of byPatient) {
    const examRes = await pool.query<{ id: string; exam_type: string; exam_date: string }>(
      `SELECT id, exam_type, exam_date FROM exams WHERE patient_id = $1`,
      [patientId],
    )
    const existingKeys = new Set(examRes.rows.map((e) => `${e.exam_type}|${e.exam_date}`))
    for (const m of moves) {
      const examDateKey = m.date ? String(m.date).slice(0, 10) : null
      if (!examDateKey) {
        console.log(`  skip (sem data): '${m.description}'`)
        continue
      }
      if (existingKeys.has(`${m.description}|${examDateKey}`)) {
        skippedExisting++
        continue
      }
      const ins = await pool.query(
        `INSERT INTO exams (patient_id, exam_type, exam_date, source, created_at)
         VALUES ($1, $2, $3, 'amil', now())
         ON CONFLICT DO NOTHING RETURNING id`,
        [patientId, m.description, examDateKey],
      )
      if (ins.rows.length) {
        created++
        existingKeys.add(`${m.description}|${examDateKey}`)
        console.log(`  created exam '${m.description}' (${examDateKey}) for ${patientId}`)
      }
    }
  }
  const finalBudget = await budgetService.getBudget()
  console.log(`\nApplied: exams criados=${created}; já existentes=${skippedExisting}`)
  console.log(`Custo LLM interno do mês após job: R$ ${(finalBudget.spentBrlCents / 100).toFixed(2)}`)
} else {
  console.log('\n(dry-run) rode com --apply para criar os exams correspondentes.')
}

await pool.end()
