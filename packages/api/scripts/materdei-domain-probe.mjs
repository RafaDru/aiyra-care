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
const link = (await pool.query(`SELECT encrypted_session_token FROM integration_links WHERE patient_id='30f2df7c-f043-44e8-a183-e6f6b49d2d71' AND portal_type='mater_dei'`)).rows[0]
const session = JSON.parse(decrypt(link.encrypted_session_token))
const req = await playwrightRequest.newContext({ baseURL: 'https://meu.materdei.com.br' })
const auth = { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' }

// Try surgical getImageExams - need accession numbers
const accessions = ['8875432', '13669360', '13669361', '6921214', '10687340', '18172437']

const paths = [
  '/proxy/surgical/surgical/domain',
  '/proxy/surgical/surgical/surgical-order/domain',
  '/proxy/exam-results/result-exam/api/v1/patients/exams/domain',
  '/proxy/exam-results/examImage/domain',
  '/proxy/exam-image/examImage/domain',
  '/proxy/exam-image/domain',
]

for (const path of paths) {
  for (const acc of accessions.slice(0, 3)) {
    const res = await req.get(path, { headers: auth, params: { accession_number: acc } })
    const body = await res.body()
    if (res.status() !== 404) {
      console.log(path, 'acc', acc, res.status(), res.headers()['content-type'], body.length, body.slice(0, 150).toString())
    }
  }
}

// POST variants
for (const path of paths) {
  const res = await req.post(path, {
    headers: { ...auth, 'Content-Type': 'application/json' },
    data: { accession_number: '13669361' },
  })
  if (res.status() !== 404) {
    const body = await res.body()
    console.log('POST', path, res.status(), body.slice(0, 200).toString())
  }
}

await req.dispose()
await pool.end()
