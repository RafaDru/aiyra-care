import pg from 'pg'
import { readFileSync } from 'fs'
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

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
})
const page = await context.newPage()
const hits = []

page.on('request', (req) => {
  const u = req.url()
  if (/wado|dicom|jpeg|jpg|png|series|instance|study|image|GetThumbnail|frame/i.test(u)) hits.push(u)
})

const domainRes = await context.request.get('https://meu.materdei.com.br/proxy/surgical/surgical/domain', {
  headers: { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' },
  params: { accession_number: '13669361' },
})
const { url } = await domainRes.json()
console.log('viewer url', url?.slice(0, 80))

await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 })
await page.waitForTimeout(8000)

console.log('page url', page.url())
console.log('network hits', hits.length)
for (const h of hits.slice(0, 30)) console.log(h.slice(0, 150))

await browser.close()
await pool.end()
