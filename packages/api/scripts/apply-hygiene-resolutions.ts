/**
 * Aplica resoluções de higienização acordadas (Rafael + Bruno).
 * Usage: npx tsx packages/api/scripts/apply-hygiene-resolutions.ts
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { Exam } from '../src/domain/exam/exam.entity.js'
import { buildExamNotes, parseExamNotes } from '../src/domain/exam/exam-notes.js'
import { ExamPgRepository } from '../src/infrastructure/persistence/exam.pg.repository.js'
import { HygienePgRepository } from '../src/infrastructure/persistence/hygiene.pg.repository.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const RAFAEL_CANONICAL = 'eb177cfb-4ee7-4041-bec1-1427e9971a6d'
const RAFAEL_DUPLICATES = [
  '16b7977c-c81d-4769-8b67-a8fa628faab6',
  '3b800378-6e18-49ec-9b28-e8062c3c2db7',
  '2225d436-0db3-430a-a53a-9ca0f432055a',
  'fa84c26b-1261-4b26-a6a3-f340f19b1c3f',
  '5ef586be-7ad3-4526-ab9a-6b707fecd532',
]

const BRUNO_CANONICAL = '1bd9ff49-8531-4b52-ba67-c182e39610de'
const BRUNO_REMOVE = '769a61b0-7775-4ad4-b438-a8280d321a1c'

const exams = new ExamPgRepository(pool)
const hygiene = new HygienePgRepository(pool)

async function accountForPatient(patientId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT owner_account_id FROM patients WHERE id = $1`,
    [patientId],
  )
  const owner = rows[0]?.owner_account_id as string | undefined
  if (owner) return owner
  const mem = await pool.query(
    `SELECT account_id FROM patient_memberships WHERE patient_id = $1 LIMIT 1`,
    [patientId],
  )
  const acc = mem.rows[0]?.account_id as string | undefined
  if (!acc) throw new Error(`No account for patient ${patientId}`)
  return acc
}

async function markDuplicate(canonicalId: string, duplicateId: string, resolvedBy: string) {
  const dup = await exams.findById(duplicateId)
  if (!dup) {
    console.warn(`Exam ${duplicateId} not found, skip mark`)
    return
  }
  const { dedup, meta } = parseExamNotes(dup.notes)
  const nextMeta = {
    ...meta,
    hygieneCanonicalId: canonicalId,
    hygieneResolvedBy: resolvedBy,
    hygieneResolvedAt: new Date().toISOString(),
  }
  await exams.update(
    Exam.restore({
      ...dup.toJSON(),
      notes: buildExamNotes(dedup, nextMeta),
    }),
  )
  console.log(`Marked duplicate ${duplicateId} → canonical ${canonicalId}`)
}

async function resolvePendingCandidates(patientId: string, decision: string, resolvedBy: string) {
  const { rows } = await pool.query(
    `SELECT id FROM hygiene_candidates WHERE patient_id = $1 AND status = 'pending'`,
    [patientId],
  )
  for (const row of rows) {
    await hygiene.resolve(row.id as string, decision as 'same_entity', resolvedBy)
    console.log(`Resolved candidate ${row.id} as ${decision}`)
  }
}

// Rafael
const rafaelPatient = 'f3cc72fd-f11c-419e-ac82-3ae45bd313ce'
const rafaelAccount = await accountForPatient(rafaelPatient)
for (const dupId of RAFAEL_DUPLICATES) {
  await markDuplicate(RAFAEL_CANONICAL, dupId, rafaelAccount)
}
await resolvePendingCandidates(rafaelPatient, 'same_entity', rafaelAccount)

// Bruno — marcar duplicata e remover exame sem laudo
const brunoPatient = '30f2df7c-f043-44e8-a183-e6f6b49d2d71'
const brunoAccount = await accountForPatient(brunoPatient)
await markDuplicate(BRUNO_CANONICAL, BRUNO_REMOVE, brunoAccount)
await exams.delete(BRUNO_REMOVE)
console.log(`Deleted exam without laudo ${BRUNO_REMOVE}`)
await resolvePendingCandidates(brunoPatient, 'same_entity', brunoAccount)

// Cleanup candidates referencing deleted Bruno exam
await pool.query(
  `DELETE FROM hygiene_candidates
   WHERE entity_id_a = $1 OR entity_id_b = $1`,
  [BRUNO_REMOVE],
)

const { rows: pending } = await pool.query(
  `SELECT COUNT(*)::int AS n FROM hygiene_candidates WHERE status = 'pending'`,
)
console.log(`Done. Pending candidates remaining: ${pending[0]?.n ?? 0}`)

await pool.end()
