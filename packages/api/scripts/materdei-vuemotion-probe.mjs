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

const domainRes = await req.get('/proxy/surgical/surgical/domain', {
  headers: auth,
  params: { accession_number: '13669361' },
})
const domainJson = await domainRes.json()
console.log('domain:', domainJson)

const viewerUrl = domainJson.url
if (viewerUrl) {
  const pageRes = await req.get(viewerUrl, { headers: { Accept: '*/*' } })
  const html = await pageRes.text()
  console.log('viewer status', pageRes.status(), 'len', html.length)
  // find script src and api patterns
  for (const m of html.matchAll(/https?:\/\/[^"'\s]+/g)) {
    const u = m[0]
    if (/vuemotion|wado|dicom|image|study|series|instance/i.test(u)) console.log('url:', u.slice(0, 120))
  }
  for (const m of html.matchAll(/\/[a-zA-Z0-9_\-\/]*(wado|dicom|study|series|image)[a-zA-Z0-9_\-\/]*/gi)) {
    console.log('path:', m[0])
  }
}

// Try getImageExams explicitly
const paths = [
  '/proxy/surgical/surgical/domain/getImageExams',
  '/proxy/surgical/surgical/surgical-order/getImageExams',
]
for (const path of paths) {
  const r = await req.get(path, { headers: auth, params: { accession_number: '13669361' } })
  console.log(path, r.status(), (await r.text()).slice(0, 300))
}

await req.dispose()
await pool.end()
