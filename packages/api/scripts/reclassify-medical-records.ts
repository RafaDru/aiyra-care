/**
 * Job geral: re-mapeamento e recategorização de atendimentos de QUALQUER operadora.
 *
 * 1. Se destination === 'exam': cria o registro na tabela `exams` e remove de `medical_records`.
 * 2. Se destination === 'medical_record': atualiza a coluna `record_type` com a categoria
 *    refinada (ex.: 'consulta', 'pronto-socorro', 'teleconsulta', 'procedimento', 'outro').
 *
 * Reutiliza o motor 3-Tier (LlmBackedLabelClassifier + VectorEmbedding + Cache Dinâmico).
 *
 * Usage:
 *   npx tsx packages/api/scripts/reclassify-medical-records.ts                    # dry-run
 *   npx tsx packages/api/scripts/reclassify-medical-records.ts --apply            # aplica alterações
 *   npx tsx packages/api/scripts/reclassify-medical-records.ts --llm              # dry-run + fallback LLM
 *   npx tsx packages/api/scripts/reclassify-medical-records.ts --apply --llm      # aplica com LLM
 *   npx tsx packages/api/scripts/reclassify-medical-records.ts --source=unimed    # limita a uma fonte
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
const sourceArg = process.argv.find((a) => a.startsWith('--source='))
const source = sourceArg ? sourceArg.slice('--source='.length) : null

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
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
  record_type: string
  source: string
}

const where = source
  ? `WHERE source = $1 AND description IS NOT NULL AND btrim(description) <> ''`
  : `WHERE description IS NOT NULL AND btrim(description) <> ''`
const params: string[] = source ? [source] : []

const { rows } = await pool.query<Row>(
  `SELECT id, patient_id, record_date, description, record_type, source
     FROM medical_records
     ${where}
    ORDER BY patient_id, record_date`,
  params,
)

const chunk = <T>(arr: T[], n: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

interface MoveToExam {
  id: string
  patient_id: string
  description: string
  date: string | null
  source: string
  canonicalName?: string
}

interface UpdateKind {
  id: string
  oldKind: string
  newKind: string
  description: string
}

const movesToExam: MoveToExam[] = []
const updatesKind: UpdateKind[] = []
const byDest = new Map<string, number>()

for (const batch of chunk(rows, 40)) {
  const labels = batch.map((r) => r.description!)
  const results = await classifier.classifyBatch(labels)
  batch.forEach((r, i) => {
    const c = results[i]
    if (!c) return
    byDest.set(c.destination, (byDest.get(c.destination) ?? 0) + 1)

    const dateStr = r.record_date ? new Date(r.record_date).toISOString().slice(0, 10) : '-'
    console.log(
      `  [${r.source}] '${r.description}' (${dateStr}) -> dest:${c.destination}, kind:${c.kind} (${c.method}, conf=${c.confidence.toFixed(2)})${c.canonicalName ? ' as=' + c.canonicalName : ''}`,
    )

    if (c.destination === 'exam') {
      movesToExam.push({
        id: r.id,
        patient_id: r.patient_id,
        description: c.canonicalName || r.description!,
        date: r.record_date,
        source: r.source,
        canonicalName: c.canonicalName,
      })
    } else if (c.kind && c.kind !== r.record_type) {
      updatesKind.push({
        id: r.id,
        oldKind: r.record_type,
        newKind: c.kind,
        description: r.description!,
      })
    }
  })
}

const budget = await budgetService.getBudget()
console.log(`\n==================================================`)
console.log(`Total medical_records analisados: ${rows.length} (fonte: ${source ?? 'todas'})`)
console.log(`Classificação de destinos: ${[...byDest.entries()].map(([k, v]) => `${k}=${v}`).join(', ')}`)
console.log(`Candidatos a mover para TABELA EXAMS: ${movesToExam.length}`)
console.log(`Candidatos a atualizar RECORD_TYPE: ${updatesKind.length}`)
console.log(
  `LLM interno: ${useLlm ? 'ligado' : 'desligado (use --llm)'} | Custo do mês: R$ ${(budget.spentBrlCents / 100).toFixed(2)} / R$ ${(budget.monthlyBudgetBrlCents / 100).toFixed(2)}${budget.exhausted ? ' (TETO ESGOTADO)' : ''}`,
)
console.log(`==================================================\n`)

if (apply) {
  let examsCreated = 0
  let medicalRecordsDeleted = 0
  let kindsUpdated = 0

  // 1. Mover exames para a tabela EXAMS e remover de medical_records
  for (const m of movesToExam) {
    const examDateKey = m.date ? new Date(m.date).toISOString().slice(0, 10) : null
    if (!examDateKey) continue

    const ins = await pool.query(
      `INSERT INTO exams (patient_id, exam_type, exam_date, source, created_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT DO NOTHING RETURNING id`,
      [m.patient_id, m.description, examDateKey, m.source || 'manual'],
    )

    if (ins.rows.length) {
      examsCreated++
      await pool.query(`DELETE FROM medical_records WHERE id = $1`, [m.id])
      medicalRecordsDeleted++
      console.log(`  [MOVIDO PARA EXAMS] '${m.description}' (${examDateKey}) para paciente ${m.patient_id}`)
    }
  }

  // 2. Atualizar record_type para registros que permanecem em medical_records
  for (const u of updatesKind) {
    await pool.query(`UPDATE medical_records SET record_type = $1 WHERE id = $2`, [u.newKind, u.id])
    kindsUpdated++
    console.log(`  [RECATEGORIZADO] '${u.description}' | '${u.oldKind}' -> '${u.newKind}'`)
  }

  const finalBudget = await budgetService.getBudget()
  console.log(`\n==================================================`)
  console.log(`APLICADO COM SUCESSO:`)
  console.log(`  - Exames criados na tabela EXAMS: ${examsCreated}`)
  console.log(`  - Medical Records removidos (movidos): ${medicalRecordsDeleted}`)
  console.log(`  - Medical Records recategorizados (record_type): ${kindsUpdated}`)
  console.log(`Custo LLM interno acumulado do mês: R$ ${(finalBudget.spentBrlCents / 100).toFixed(2)}`)
  console.log(`==================================================\n`)
} else {
  console.log('(dry-run) Rode com --apply para executar as alterações no banco de dados.')
}

await pool.end()
