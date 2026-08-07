import pg from 'pg'
import { readFileSync, writeFileSync } from 'fs'
import { createDecipheriv } from 'crypto'
import { chromium } from 'playwright'

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

const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
})
const page = await context.newPage()

const getImages = []
const jsonEndpoints = []

page.on('response', async (res) => {
  const u = res.url()
  if (u.includes('GetImage')) getImages.push(u)
  if (/JsonEndpoint|PatientStudyHistory|GetSeries|GetStudy/i.test(u) && res.status() === 200) {
    try {
      const j = await res.json()
      jsonEndpoints.push({ url: u, body: j })
    } catch { /* ignore */ }
  }
})

const domainRes = await context.request.get('https://meu.materdei.com.br/proxy/surgical/surgical/domain', {
  headers: { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' },
  params: { accession_number: '13669361' },
})
const { url } = await domainRes.json()
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await page.waitForTimeout(25_000)

console.log('GetImage urls:', getImages.length)
getImages.forEach((u) => console.log(u))

console.log('\nJSON endpoints:', jsonEndpoints.length)
for (const e of jsonEndpoints) {
  console.log('\n---', e.url.split('/').slice(-2).join('/'), '---')
  writeFileSync('tmp-vuemotion-json.json', JSON.stringify(jsonEndpoints, null, 2))
  console.log(JSON.stringify(e.body).slice(0, 800))
}

await browser.close()
await pool.end()
