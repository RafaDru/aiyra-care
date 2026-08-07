import pg from 'pg'
import { readFileSync } from 'fs'
import { createDecipheriv } from 'crypto'
import { request as playwrightRequest } from 'playwright'

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

const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const brunoId = '30f2df7c-f043-44e8-a183-e6f6b49d2d71'
const exams = await pool.query(`
  SELECT exam_type, exam_date, result_file_url, notes
  FROM exams WHERE patient_id=$1 AND source='mater_dei' AND exam_type ILIKE '%TC%'
  ORDER BY exam_date DESC
`, [brunoId])
console.log('TC exams:', exams.rows.map(r => ({ type: r.exam_type, file: r.result_file_url, meta: r.notes?.split('\n')[1] })))

const link = (await pool.query(`SELECT encrypted_session_token FROM integration_links WHERE patient_id=$1 AND portal_type='mater_dei' LIMIT 1`, [brunoId])).rows[0]
if (!link?.encrypted_session_token) { console.log('no session'); await pool.end(); process.exit(0) }
const session = JSON.parse(decrypt(link.encrypted_session_token))
const req = await playwrightRequest.newContext({ baseURL: 'https://meu.materdei.com.br' })
const auth = { Authorization: `Bearer ${session.accessToken}`, Accept: '*/*' }
const gateway = session.gatewayPatientId ?? 1539788

// Find TC exams from portal
const res = await req.get('/proxy/exam-results/result-exam/api/v1/patients/exams/search', {
  headers: auth,
  params: { patientId: String(gateway), startDate: '2025-01-01', endDate: '2026-12-31', pageNumber: '1', pageSize: '50' },
})
const list = (await res.json()).data ?? []
for (const row of list) {
  for (const it of row.order?.items ?? []) {
    if (!/TC|TORAX|SEIOS/i.test(it.description ?? '')) continue
    console.log('\n===', it.description, '===')
    console.log('order', row.order?.id, 'item', it.id, 'type', it.type, 'img', it.imageAvailable)
    const meta = {
      attendanceId: row.attendanceId,
      examOrderId: row.order?.id,
      hospitalId: row.hospitalId,
      examOrderItemId: it.id,
    }
    // probe image endpoints
    const paths = [
      `/proxy/exam-results/result-exam/api/v1/patients/exams/items/${it.id}/images`,
      `/proxy/exam-results/result-exam/api/v1/patients/exams/items/${it.id}/image`,
      `/proxy/exam-results/result-exam/api/v1/patients/exams/${it.id}/images`,
      `/proxy/exam-results/result-exam/api/v1/patients/exams/image-viewer`,
      `/proxy/exam-results/result-exam/api/v1/patients/exams/download`,
    ]
    for (const path of paths) {
      const r = await req.get(path, {
        headers: auth,
        params: path.includes('download') ? {
          attendanceId: String(meta.attendanceId),
          examOrderId: String(meta.examOrderId),
          hospitalId: String(meta.hospitalId),
          examOrderItemId: String(meta.examOrderItemId),
          type: 'IMAGE',
        } : { examOrderItemId: String(it.id), patientId: String(gateway) },
      })
      const body = await r.body()
      const ct = r.headers()['content-type'] ?? ''
      console.log(path.split('/').slice(-2).join('/'), r.status(), ct, body.length, body.length < 200 ? body.toString() : '')
    }
  }
}

await req.dispose()
await pool.end()
