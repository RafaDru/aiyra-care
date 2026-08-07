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

const ORIGIN = 'https://meu.materdei.com.br'
const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const link = (await pool.query(`SELECT encrypted_session_token FROM integration_links il JOIN patients p ON p.id=il.patient_id WHERE portal_type='mater_dei' AND p.name ILIKE '%bruno%' LIMIT 1`)).rows[0]
const token = JSON.parse(decrypt(link.encrypted_session_token)).accessToken
const req = await playwrightRequest.newContext({ baseURL: ORIGIN })
const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

const base = {
  attendanceId: '12275476',
  examOrderId: '6921214',
  hospitalId: '1',
  examOrderItemId: '8875432',
}

for (const type of ['LAUDO', 'IMAGEM', 'GERAL', 'PARCIAL', 'TOTAL', 'RESULT', 'REPORT', 'IMAGE', '1', '2', '3']) {
  for (const path of ['download', 'partially-available/download']) {
    const res = await req.get(`/proxy/exam-results/result-exam/api/v1/patients/exams/${path}`, {
      headers: auth,
      params: { ...base, type },
    })
    const body = await res.body()
    if (res.ok()) console.log('OK', path, type, body.length, res.headers()['content-type'])
    else if (body.length < 200) console.log('fail', path, type, res.status(), body.toString())
  }
}

await req.dispose()
await pool.end()
