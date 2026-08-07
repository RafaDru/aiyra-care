import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createDecipheriv } from 'crypto'
import { request as playwrightRequest } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(root, 'gcp-key.json')
process.env.GCS_BUCKET = process.env.GCS_BUCKET || 'openhealth-documents-503119'

const { persistMaterDeiExamFiles } = await import('../src/infrastructure/scraper/materdei-exam-persist.ts')
const { resolveMaterDeiPatientId } = await import('../src/infrastructure/scraper/materdei-patient-resolver.ts')

const env = Object.fromEntries(
  readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)

function decrypt(payload) {
  const key = Buffer.from(env.CRYPTO_KEY, 'hex')
  const [ivHex, tagHex, dataHex] = payload.split(':')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
}

const BRUNO_ID = '30f2df7c-f043-44e8-a183-e6f6b49d2d71'
const GATEWAY_PATIENT_ID = 1539788
const TARGET_ITEMS = new Set(['13669361', '13669360'])

const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const link = (await pool.query(
  'SELECT encrypted_session_token FROM integration_links WHERE patient_id = $1 AND portal_type = $2',
  [BRUNO_ID, 'mater_dei'],
)).rows[0]
const session = JSON.parse(decrypt(link.encrypted_session_token))

const examsRes = await pool.query(
  'SELECT exam_type, notes FROM exams WHERE patient_id = $1 AND source = $2',
  [BRUNO_ID, 'mater_dei'],
)

const items = []
for (const row of examsRes.rows) {
  const nl = row.notes?.indexOf('\n')
  if (nl < 0) continue
  const meta = JSON.parse(row.notes.slice(nl + 1))
  if (!meta.imageAvailable || !meta.examOrderItemId) continue
  if (!TARGET_ITEMS.has(String(meta.examOrderItemId))) continue
  items.push({
    examOrderId: meta.examOrderId,
    examOrderItemId: meta.examOrderItemId,
    examType: row.exam_type,
    examDate: '08/07/2026',
    status: 'done',
    provider: 'Mater Dei',
    orderType: meta.orderType ?? 'IMAGE',
    itemType: 'IMAGE',
    imageAvailable: true,
    reportAvailable: meta.reportAvailable ?? true,
    accessionNumber: meta.accessionNumber,
    hospitalId: meta.hospitalId,
    attendanceId: meta.attendanceId,
    patientName: 'BRUNO DRUMMOND FREITAS REIS',
    raw: meta,
  })
}

console.log('Persistindo VueMotion para', items.map((i) => i.examType).join(', '))

const req = await playwrightRequest.newContext({ baseURL: 'https://meu.materdei.com.br' })
const patients = [{ id: BRUNO_ID, name: 'Bruno Drummond Freitas Reis' }]
const resolvePatientId = (exam) => resolveMaterDeiPatientId(exam.patientName, BRUNO_ID, patients)

const downloaded = await persistMaterDeiExamFiles({
  pool,
  request: req,
  accessToken: session.accessToken,
  gatewayPatientId: GATEWAY_PATIENT_ID,
  exams: items,
  resolvePatientId,
  onProgress: (msg) => console.log(msg),
})

console.log('Arquivos baixados:', downloaded)
await req.dispose()
await pool.end()
