import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

function buildExamOrderExternalKey(source, portalOrderId) {
  const src = source.trim().toLowerCase()
  const id = portalOrderId.trim()
  return `${src}:pedido:${id}`
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const sql = readFileSync(resolve(root, 'database/relational/041_exam_orders.sql'), 'utf8')
await pool.query(sql)
console.log('041_exam_orders schema applied')

function metaFromNotes(notes) {
  if (!notes) return {}
  const nl = notes.indexOf('\n')
  if (nl < 0) return {}
  try {
    return JSON.parse(notes.slice(nl + 1))
  } catch {
    return {}
  }
}

const { rows: exams } = await pool.query(
  `SELECT id, patient_id, source, exam_date, laboratory, notes, result_file_url, exam_order_id
   FROM exams WHERE notes IS NOT NULL`,
)

const groups = new Map()

for (const row of exams) {
  const meta = metaFromNotes(row.notes)
  const pedidoId = typeof meta.pedidoId === 'string' ? meta.pedidoId : null
  if (!pedidoId || pedidoId === 'unknown') continue
  const source = String(row.source ?? 'manual')
  const key = `${row.patient_id}|${buildExamOrderExternalKey(source, pedidoId)}`
  const list = groups.get(key) ?? []
  list.push(row)
  groups.set(key, list)
}

let ordersCreated = 0
let examsLinked = 0

for (const [, group] of groups) {
  const first = group[0]
  const meta = metaFromNotes(first.notes)
  const pedidoId = String(meta.pedidoId)
  const source = String(first.source ?? 'manual')
  const externalKey = buildExamOrderExternalKey(source, pedidoId)
  const withDoc = group.find((r) => typeof metaFromNotes(r.notes).documentId === 'string')
  const resolvedDocId = withDoc ? metaFromNotes(withDoc.notes).documentId : null
  const resultFile = group.find((r) => r.result_file_url)?.result_file_url ?? null

  const { rows: orderRows } = await pool.query(
    `INSERT INTO exam_orders (
      patient_id, external_key, source, portal_order_id, order_date, laboratory,
      result_file_url, document_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (patient_id, external_key) DO UPDATE SET
      order_date = COALESCE(EXCLUDED.order_date, exam_orders.order_date),
      laboratory = COALESCE(EXCLUDED.laboratory, exam_orders.laboratory),
      result_file_url = COALESCE(EXCLUDED.result_file_url, exam_orders.result_file_url),
      document_id = COALESCE(EXCLUDED.document_id, exam_orders.document_id)
    RETURNING id`,
    [
      first.patient_id,
      externalKey,
      source,
      pedidoId,
      first.exam_date,
      first.laboratory,
      resultFile,
      resolvedDocId,
    ],
  )
  const orderId = orderRows[0].id
  ordersCreated++

  for (const row of group) {
    if (row.exam_order_id === orderId) continue
    await pool.query('UPDATE exams SET exam_order_id = $1 WHERE id = $2', [orderId, row.id])
    examsLinked++
  }
}

console.log(`Backfill: ${ordersCreated} pedido(s), ${examsLinked} exame(s) vinculados`)
await pool.end()
