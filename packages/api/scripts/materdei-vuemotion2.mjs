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
const req = await playwrightRequest.newContext({
  baseURL: 'https://meu.materdei.com.br',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
})
const auth = { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' }

for (const acc of ['13669361', '13669360']) {
  const r = await req.get('/proxy/surgical/surgical/domain', { headers: auth, params: { accession_number: acc } })
  console.log('acc', acc, await r.text())
}

const domainJson = await (await req.get('/proxy/surgical/surgical/domain', {
  headers: auth,
  params: { accession_number: '13669361' },
})).json()

const viewerUrl = domainJson.url
console.log('\nFetching viewer with Chrome UA...')
const pageRes = await req.get(viewerUrl, {
  headers: {
    Accept: 'text/html,*/*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  maxRedirects: 5,
})
console.log('final url', pageRes.url(), pageRes.status())
const html = await pageRes.text()
console.log('html len', html.length, html.slice(0, 500))

// Look for API in HTML
for (const m of html.matchAll(/wado|dicomweb|GetImage|series|instance|jpeg|png/gi)) {
  // skip
}
const apis = [...html.matchAll(/\/portal\/[A-Za-z0-9_./?=&%-]+/g)].slice(0, 20)
apis.forEach((m) => console.log('portal path:', m[0].slice(0, 100)))

await req.dispose()
await pool.end()
