import pg from 'pg'
import { readFileSync, writeFileSync } from 'fs'
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

const ORIGIN = 'https://meu.materdei.com.br'
const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const link = (await pool.query(`SELECT * FROM integration_links il JOIN patients p ON p.id=il.patient_id WHERE il.portal_type='mater_dei' AND p.name ILIKE '%bruno%' LIMIT 1`)).rows[0]
const session = JSON.parse(decrypt(link.encrypted_session_token))
const token = session.accessToken
const req = await playwrightRequest.newContext({ baseURL: ORIGIN })
const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

const base = {
  attendanceId: '12275476',
  examOrderId: '6921214',
  hospitalId: '1',
  examOrderItemId: '8875432',
}

for (const type of ['IMAGE', 'REPORT', 'PDF', 'LAUDO', 'image', 'report', '']) {
  const dl = await req.get('/proxy/exam-results/result-exam/api/v1/patients/exams/download', {
    headers: auth,
    params: { ...base, type },
  })
  const ct = dl.headers()['content-type'] ?? ''
  const body = await dl.body()
  console.log('type=', JSON.stringify(type), 'status', dl.status(), ct, body.length, body.length < 300 ? body.toString('utf8') : 'ok')
  if (dl.ok() && body.length > 500) writeFileSync(`tmp-dl-${type || 'empty'}.bin`, body)
}

// Try exams proxy paths
for (const path of [
  '/proxy/exams/exams/api/v1/exams',
  '/proxy/exams/exams/api/v1/exams?search=bruno',
]) {
  const res = await req.get(path, { headers: auth })
  const ct = res.headers()['content-type'] ?? ''
  const body = await res.body()
  console.log('PATH', res.status(), path, ct, body.length, body.slice(0, 80).toString('utf8'))
}

await req.dispose()
await pool.end()
